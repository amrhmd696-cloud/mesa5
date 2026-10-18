import { NextResponse, type NextRequest } from "next/server";
import { posts } from "@/lib/blog";

// Proxy (antes "middleware"): se ejecuta antes de renderizar cada petición.
// Por ahora solo devuelve un 404 real para artículos del blog que no existen,
// porque con Partial Prefetching la página empezaría a enviarse con código 200.
// En la fase 1B aquí se refrescará también la sesión de Supabase.

const blogSlugs = new Set(posts.map((p) => p.slug));

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (match && !blogSlugs.has(decodeURIComponent(match[1]))) {
    // Reescribe a una ruta que no existe para servir la página 404 con su código correcto.
    return NextResponse.rewrite(new URL("/_no-encontrado", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/blog/:slug"],
};
