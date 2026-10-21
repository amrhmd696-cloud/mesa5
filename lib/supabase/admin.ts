import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Cliente de Supabase con la clave SECRETA: se salta Row Level Security.
// Solo para el servidor y solo donde no hay usuario (webhook de Stripe) o para
// escribir columnas que el usuario no puede tocar (plan, ids de Stripe).
// Nunca lo importes desde un componente de cliente.

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY (mira .env.example)");
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
