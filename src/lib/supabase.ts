import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browser: SupabaseClient | null = null;

/** Browser client with a persisted session (teachers / admin). */
export function supabase() {
  if (!browser) browser = createClient(url, key);
  return browser;
}

/** Stateless client for server components and route handlers. */
export function serverSupabase() {
  return createClient(url, key, { auth: { persistSession: false } });
}
