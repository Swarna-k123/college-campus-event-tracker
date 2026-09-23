import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Add them to your .env file (or your " +
      "hosting provider's environment variables) — otherwise the app cannot reach the database."
  );
}

// Fall back to a placeholder (but validly-formed) URL/key when env vars are missing.
// createClient() throws synchronously if the URL is empty/invalid, which would crash the
// entire app on load (before React even mounts). Using a placeholder lets the app render
// normally; real Supabase calls (login, data fetches, etc.) will then fail gracefully at
// call time with a catchable error instead of a blank white screen.
const fallbackUrl = "https://placeholder.supabase.co";
const fallbackKey = "placeholder-anon-key";

/** Typed loosely — tables exist in your Supabase project. */
export const supabase = createClient(url || fallbackUrl, anonKey || fallbackKey);
