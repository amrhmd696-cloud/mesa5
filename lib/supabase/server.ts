import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Actúa como el usuario que ha iniciado sesión, así que RLS se aplica siempre.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // En un Server Component no se pueden escribir cookies; no pasa nada
          // porque el proxy (proxy.ts) ya refresca la sesión en cada petición.
        }
      },
    },
  });
}
