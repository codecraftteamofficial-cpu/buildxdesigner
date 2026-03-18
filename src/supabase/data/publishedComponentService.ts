import { supabase } from "../config/supabaseClient";

// ── Publish (Export) ─────────────────────────────────────────────────────────
export async function publishComponent(
  userId: string,
  name: string,
  description: string,
  componentJson: any,
  componentId: string
) {
  try {
    const { data, error } = await supabase
      .from("published_components")
      .insert({
        user_id: userId,
        name,
        description,
        component_json: componentJson,
        component_id: componentId, // Add component_id from custom_components
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error publishing component:", error);
    return { data: null, error };
  }
}

// ── Fetch community library ─────────────────────────────────────────────────
export async function fetchPublishedComponents() {
  try {
    const { data, error } = await supabase
      .from("published_components")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching published components:", error);
    return { data: null, error };
  }
}

// ── Import (copy published → custom_components) ─────────────────────────────
export async function importPublishedComponent(
  projectId: string,
  publishedComponent: { name: string; component_json: any }
) {
  try {
    const { data, error } = await supabase
      .from("custom_components")
      .insert({
        project_id: projectId,
        name: publishedComponent.name,
        component_json: publishedComponent.component_json,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error importing published component:", error);
    return { data: null, error };
  }
}
