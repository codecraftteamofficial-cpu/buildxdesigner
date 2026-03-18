import { supabase } from "../config/supabaseClient";

export async function saveCustomComponent(projectId: string, name: string, data: any) {
  try {
    const { data: result, error } = await supabase
      .from("custom_components")
      .insert({
        project_id: projectId,
        name: name,
        component_json: data,
        isPublic: 0, // Default to private (0) when creating new components
      })
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error("Error saving custom component:", error);
    return { data: null, error };
  }
}

export async function fetchCustomComponents(projectId: string) {
  try {
    const { data, error } = await supabase
      .from("custom_components")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching custom components:", error);
    return { data: null, error };
  }
}

export async function deleteCustomComponent(id: string) {
  try {
    const { error } = await supabase
      .from("custom_components")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error deleting custom component:", error);
    return { error };
  }
}

export async function updateCustomComponent(id: string, name: string, data: any) {
  try {
    const { data: result, error } = await supabase
      .from("custom_components")
      .update({
        name: name,
        component_json: data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error("Error updating custom component:", error);
    return { data: null, error };
  }
}

export async function updateCustomComponentPublicStatus(id: string, isPublic: boolean) {
  try {
    const { data: result, error } = await supabase
      .from("custom_components")
      .update({
        isPublic: isPublic ? 1 : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error("Error updating custom component public status:", error);
    return { data: null, error };
  }
}

export async function deletePublishedComponent(publishedId: string) {
  try {
    const { error } = await supabase
      .from("published_components")
      .delete()
      .eq("id", publishedId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error deleting published component:", error);
    return { error };
  }
}
