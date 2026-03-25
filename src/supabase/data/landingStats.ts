import { supabase } from '../config/supabaseClient';

export interface LandingStats {
  activeCreators: number;
  websitesBuilt: number;
}

export async function fetchLandingStats(): Promise<{ data: LandingStats | null; error: string | null }> {
  try {
    const [profilesResult, projectsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true }),
    ]);

    if (profilesResult.error) {
      return { data: null, error: profilesResult.error.message };
    }

    if (projectsResult.error) {
      return { data: null, error: projectsResult.error.message };
    }

    return {
      data: {
        activeCreators: profilesResult.count ?? 0,
        websitesBuilt: projectsResult.count ?? 0,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error?.message ?? 'Failed to fetch landing stats.' };
  }
}