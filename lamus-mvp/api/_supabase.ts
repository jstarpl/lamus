import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return createClient(SUPABASE_URL, SERVICE_KEY);
}
