import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Cliente anónimo, sin cookies ni sesión: para las páginas públicas
// (/r/<slug>). Solo puede usar lo que la base de datos deja a "anon".
export function createPublicClient() {
  return createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
