import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Refresca la sesión de Supabase en cada petición y devuelve la respuesta con
 * las cookies actualizadas, junto con el id del usuario (o null).
 * Lo llama proxy.ts antes de renderizar cualquier página.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return { response, userId: null as string | null };

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims() valida el token (no basta con leer la cookie).
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  return { response, userId };
}
