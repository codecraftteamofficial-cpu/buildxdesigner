import { supabase } from "../config/supabaseClient";

const STEP_LS_KEY_MAP: Record<string, string> = {
  dashboard:   "buildx-tutorial-dashboard",
  palette:     "buildx-tutorial-intro",
  canvas:      "buildx-tutorial-canvas",
  properties:  "buildx-tutorial-properties",
  website:     "buildx-tutorial-website-creation",
  ai:          "buildx-tutorial-ai",
  code:        "buildx-tutorial-code",
  collab:      "buildx-tutorial-collab",
  publishing:  "buildx-tutorial-publishing-basics",
};

export const readLocalProgress = (): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(STEP_LS_KEY_MAP).map(([key, lsKey]) => [
      key,
      localStorage.getItem(lsKey) === "1",
    ]),
  );

export const writeLocalProgress = (completed: Record<string, boolean>) => {
  Object.entries(completed).forEach(([key, val]) => {
    const lsKey = STEP_LS_KEY_MAP[key];
    if (lsKey) {
      if (val) localStorage.setItem(lsKey, "1");
      else localStorage.removeItem(lsKey);
    }
  });
};

export const fetchTutorialProgress = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_tutorial_progress")
    .select("step_key, completed")
    .eq("user_id", userId);

  if (error) throw error;
  return data ?? [];
};

export const markStepComplete = async (userId: string, stepKey: string) => {
  // Write to localStorage immediately for instant UI
  const lsKey = STEP_LS_KEY_MAP[stepKey];
  if (lsKey) localStorage.setItem(lsKey, "1");

  // Upsert to Supabase async (non-blocking)
  const { error } = await supabase
    .from("user_tutorial_progress")
    .upsert(
      {
        user_id: userId,
        step_key: stepKey,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,step_key" },
    );

  if (error) throw error;
};

export const migrateLocalProgressToDB = async (
  userId: string,
  completed: Record<string, boolean>,
) => {
  const completedSteps = Object.entries(completed)
    .filter(([, val]) => val)
    .map(([key]) => ({
      user_id: userId,
      step_key: key,
      completed: true,
      completed_at: new Date().toISOString(),
    }));

  if (completedSteps.length === 0) return;

  const { error } = await supabase
    .from("user_tutorial_progress")
    .upsert(completedSteps, { onConflict: "user_id,step_key" });

  if (error) throw error;
};