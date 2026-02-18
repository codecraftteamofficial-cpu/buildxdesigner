/// <reference types="../../vite-env.d.ts" />

import {
  createClient,
  AuthResponse,
  Provider,
  AuthError,
  Session,
  AuthChangeEvent,
} from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY) are missing during build/init. App may fail to connect if they are truly absent at runtime.",
  );
}

const SUPABASE_OAUTH_CLIENT_ID = "c169dad4-7d02-4938-b977-b30c4a5c15ce";
const SUPABASE_OAUTH_CLIENT_SECRET =
  "sba_8ad4f8116daf4199d4387bfca901595f1134d02e";
const SUPABASE_REDIRECT_URI =
  "http://localhost:3000/api/supabase/oauth/callback";

const finalUrl = SUPABASE_URL || "https://odswfrqmqbybfkhpemsv.supabase.co";
const finalKey =
  SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3dmcnFtcWJ5YmZraHBlbXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Nzc3ODYsImV4cCI6MjA3NDI1Mzc4Nn0.2iHmgFmD7LxXaXcPO2iOHsimgVt2uCVBFHkKCUTVA-E";

export const supabase = createClient(finalUrl, finalKey);

export type SupabaseAuthResponse = AuthResponse;
export type SupabaseProvider = Provider;
export type SupabaseAuthError = AuthError;
export type SupabaseSession = Session;
export type SupabaseAuthChangeEvent = AuthChangeEvent;
