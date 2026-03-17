import { getApiBaseUrl } from "../utils/apiConfig";
import type { Project } from "../supabase/types/project";
import { supabase } from "../supabase/config/supabaseClient";

export async function fetchDraftProjectsFromApi(
  userId: string,
): Promise<Project[]> {
  const apiBaseUrl = getApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}/api/draft-projects/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    if (response.status === 404) {
      return [];
    }

    throw new Error(
      errorBody?.details ||
        `Failed to fetch draft projects: ${response.status}`,
    );
  }

  const result = await response.json();

  return (result.draftProjects || []).map((project: any) => ({
    id: project.projects_id,
    name: project.project_name,
    description: project.description || "",
    thumbnail: project.thumbnail || "/placeholder.svg",
    lastModified: project.updated_at,
    isPublished: project.is_published,
    status: "draft",
    category: project.category || "Starter",
    project_layout: project.project_layout || [],
    type: project.type || "design",
  }));
}

export async function fetchTrendingTemplatesFromApi(limit = 20) {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(
    `${apiBaseUrl}/api/most-liked-templates?limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch trending templates: ${response.status}`);
  }

  const data = await response.json();
  return data.templates || [];
}

export async function fetchTrashedProjectsFromApi(
  userId: string,
): Promise<Project[]> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(
    `${apiBaseUrl}/api/trashed-templates?userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    if (response.status === 404) {
      return [];
    }

    throw new Error(
      errorBody?.details ||
        `Failed to fetch trashed projects: ${response.status}`,
    );
  }

  const data = await response.json();

  const rawProjects = Array.isArray(data?.templates)
    ? data.templates
    : Array.isArray(data?.trashedTemplates)
      ? data.trashedTemplates
      : Array.isArray(data?.trashedProjects)
        ? data.trashedProjects
        : Array.isArray(data?.projects)
          ? data.projects
          : Array.isArray(data)
            ? data
            : [];

  return rawProjects.map((project: any) => ({
    id: project.projects_id ?? project.id,
    name: project.project_name ?? project.name ?? "Untitled Project",
    description: project.description || "",
    thumbnail: project.thumbnail || "/placeholder.svg",
    lastModified: project.updated_at ?? project.lastModified ?? null,
    isPublished:
      project.is_published ??
      project.isPublished ??
      project.published_template ??
      false,
    status: "trash",
    category: project.category || "Starter",
    project_layout: project.project_layout || [],
    type: project.type || "design",
  }));
}

export async function sendPasswordResetEmail(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`;

  return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
}
