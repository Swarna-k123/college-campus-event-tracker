import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Add them to your .env file."
  );
}

/** Typed loosely — tables exist in your Supabase project. */
export const supabase = createClient(url ?? "", anonKey ?? "");
