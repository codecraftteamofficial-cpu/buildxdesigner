import { supabase } from "../config/supabaseClient";
import { Project } from "../types/project";

export function getLocalCanvasComponents(): any[] {
  try {
    const saved = localStorage.getItem("canvas_components");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export type LocalProjectCache = {
  id: string;
  name?: string;
  description?: string;
  thumbnail?: string;
  project_layout: any[];
  last_modified?: string;
};

export function getLocalProjectCache(
  projectId: string,
): LocalProjectCache | null {
  try {
    const key = `project_cache:${projectId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function setLocalProjectCache(
  projectId: string,
  data: LocalProjectCache,
): void {
  try {
    const key = `project_cache:${projectId}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch { }
}

export async function fetchProjectById(
  id: string,
): Promise<{ data: Project | null; error: any }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("projects")
      .select(
        "projects_id, project_name, description, thumbnail, last_modified, type, status, project_layout, subdomain, is_published, last_published_at",
      )
      .eq("projects_id", id)
      .eq("user_id", user?.id) // Security filter
      .single();

    if (error) return { data: null, error };

    const project: Project = {
      id: data.projects_id,
      name: data.project_name,
      description: data.description || "",
      thumbnail: data.thumbnail || "",
      lastModified: data.last_modified,
      type: data.type as Project["type"],
      status: data.status as Project["status"],
      project_layout: data.project_layout || [],
      subdomain: data.subdomain,
      isPublished: data.is_published,
      lastPublishedAt: data.last_published_at,
    };
    return { data: project, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

console.log("projectService.ts loaded", getLocalCanvasComponents());

export async function fetchUserProjects(): Promise<{
  data: Project[] | null;
  error: any;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: [], error: "Not authenticated" };

    const { data, error } = await supabase
      .from("projects")
      .select(
        "projects_id, project_name, description, thumbnail, last_modified, type, status, user_id, created_at, project_layout, subdomain, is_published, last_published_at",
      )
      .eq("user_id", user.id) // ONLY fetch the logged-in user's projects
      .neq("status", "trash")
      .order("last_modified", { ascending: false });

    if (error) return { data: null, error };

    const mappedData: Project[] = (data as any[]).map((item) => ({
      id: item.projects_id,
      name: item.project_name,
      description: item.description || "",
      thumbnail: item.thumbnail || "",
      lastModified: item.last_modified,
      type: item.type as Project["type"],
      status: item.status as Project["status"],
      project_layout: item.project_layout || [],
      subdomain: item.subdomain,
      isPublished: item.is_published,
      lastPublishedAt: item.last_published_at,
    }));

    return { data: mappedData, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function saveProject(
  project: Partial<Project> & { user_id: string },
): Promise<{ data: Project | null; error: any }> {
  const isNewProject =
    !project.id ||
    project.id.startsWith("new-") ||
    project.id.startsWith("ai-generated-");

  const payload: any = {
    project_name: project.name,
    description: project.description,
    thumbnail: project.thumbnail,
    user_id: project.user_id,
    project_layout: project.project_layout,
    last_modified: new Date().toISOString(),
  };

  // Only include ID if updating
  if (!isNewProject) {
    payload.projects_id = project.id;
  }

  try {
    let row: any;
    let errObj: any = null;

    if (!isNewProject) {
      const { data, error } = await supabase
        .from("projects")
        .update(payload)
        .eq("projects_id", project.id!)
        .select()
        .single();
      row = data;
      errObj = error;
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();
      row = data;
      errObj = error;
    }

    if (errObj) return { data: null, error: errObj };

    if (isNewProject && row) {
      await supabase.rpc("append_project_to_profile", {
        user_uuid: project.user_id,
        project_uuid: row.projects_id,
      });
    }

    const savedProject: Project = {
      id: row.projects_id,
      name: row.project_name,
      description: row.description || "",
      thumbnail: row.thumbnail || "",
      lastModified: row.last_modified,
      type: row.type,
      status: row.status,
      project_layout: row.project_layout || [],
    };
    return { data: savedProject, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function saveProjectMetadata(metadata: {
  id: string;
  name?: string;
  description?: string;
  thumbnail?: string;
  user_id: string;
  project_layout?: any[];
}): Promise<{ error: any }> {
  try {
    const payload: any = {
      last_modified: new Date().toISOString(),
    };

    if (metadata.name !== undefined) payload.project_name = metadata.name;
    if (metadata.description !== undefined)
      payload.description = metadata.description;
    if (metadata.thumbnail !== undefined)
      payload.thumbnail = metadata.thumbnail;
    if (metadata.project_layout !== undefined)
      payload.project_layout = metadata.project_layout;

    const { error } = await supabase
      .from("projects")
      .update(payload)
      .eq("projects_id", metadata.id)
      .eq("user_id", metadata.user_id); // Security: only update if user owns the project

    return { error };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Incremental component saving logic
 */
export async function fetchProjectComponents(
  projectId: string,
): Promise<{ data: any[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("components")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) return { data: null, error };

    const flatComponents = data || [];
    const rootComponents: any[] = [];
    const map = new Map<string, any>();

    flatComponents.forEach((c) => {
      const component = {
        id: c.id,
        type: c.type,
        props: c.props || {},
        style: c.style || {},
        position: c.position || { x: 0, y: 0 },
        children: [],
      };
      map.set(c.id, component);
    });

    flatComponents.forEach((c) => {
      const component = map.get(c.id);
      if (c.parent_id && map.has(c.parent_id)) {
        const parent = map.get(c.parent_id);
        parent.children.push(component);
      } else {
        rootComponents.push(component);
      }
    });

    return { data: rootComponents, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function syncProjectComponents(
  components: any[],
  projectId: string,
): Promise<{ error: any }> {
  try {
    const currentIds = new Set<string>();
    const flatList: any[] = [];

    const flatten = (comps: any[], parentId: string | null = null) => {
      comps.forEach((c, index) => {
        currentIds.add(c.id);
        flatList.push({
          id: c.id,
          project_id: projectId,
          type: c.type,
          props: c.props,
          style: c.style,
          position: c.position,
          parent_id: parentId,
          sort_order: index,
        });

        if (c.children && c.children.length > 0) {
          flatten(c.children, c.id);
        }
      });
    };

    flatten(components);

    const { data: existingData, error: fetchError } = await supabase
      .from("components")
      .select("id")
      .eq("project_id", projectId);

    if (fetchError) throw fetchError;

    const existingIds = existingData?.map((r) => r.id) || [];
    const idsToDelete = existingIds.filter((id) => !currentIds.has(id));

    if (idsToDelete.length > 0) {
      await supabase.from("components").delete().in("id", idsToDelete);
    }

    if (flatList.length > 0) {
      await supabase.from("components").upsert(flatList);
    }

    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

export async function deleteComponentFromDb(
  componentId: string,
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from("components")
      .delete()
      .eq("id", componentId);
    return { error };
  } catch (err) {
    return { error: err };
  }
}

export async function checkSubdomainAvailability(
  subdomain: string,
  currentProjectId: string,
): Promise<{ available: boolean; error: any }> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("projects_id")
      .eq("subdomain", subdomain)
      .neq("projects_id", currentProjectId)
      .maybeSingle();

    if (error) return { available: false, error };
    return { available: !data, error: null };
  } catch (err) {
    return { available: false, error: err };
  }
}

export async function publishProject(
  projectId: string,
  subdomain: string,
): Promise<{ url: string | null; error: any }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { url: null, error: "Not authenticated" };
    }

    // Check if subdomain is already taken by another project
    const { data: existing, error: checkError } = await supabase
      .from("projects")
      .select("projects_id")
      .eq("subdomain", subdomain)
      .neq("projects_id", projectId)
      .maybeSingle();

    if (checkError) {
      return { url: null, error: "Failed to validate subdomain availability." };
    }

    if (existing) {
      return { url: null, error: "Subdomain is already taken." };
    }

    const { data: currentProject, error: fetchError } = await fetchProjectById(projectId);

    if (fetchError || !currentProject) {
      return { url: null, error: fetchError || "Project not found" };
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        subdomain: subdomain,
        is_published: true,
        last_published_at: new Date().toISOString(),
        published_layout: currentProject.project_layout, // Save snapshot of current layout
      })
      .eq("projects_id", projectId)
      .eq("user_id", user.id);

    if (updateError) {
      return { url: null, error: updateError };
    }

    return { url: `https://${subdomain}.buildxdesigner.site`, error: null };
  } catch (err) {
    return { url: null, error: err };
  }
}

export async function fetchProjectBySubdomain(
  subdomain: string,
): Promise<{ data: Project | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "projects_id, project_name, description, thumbnail, last_modified, type, status, project_layout, published_layout, subdomain, is_published, last_published_at",
      )
      .eq("subdomain", subdomain)
      .eq("is_published", true)
      .single();

    if (error) return { data: null, error };

    const project: Project = {
      id: data.projects_id,
      name: data.project_name,
      description: data.description || "",
      thumbnail: data.thumbnail || "",
      lastModified: data.last_modified,
      type: data.type as Project["type"],
      status: data.status as Project["status"],
      project_layout: data.published_layout || data.project_layout || [],
      subdomain: data.subdomain,
      isPublished: data.is_published,
      lastPublishedAt: data.last_published_at,
    };
    return { data: project, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
