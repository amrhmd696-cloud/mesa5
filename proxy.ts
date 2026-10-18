import { NextResponse, type NextRequest } from "next/server";
import { posts } from "@/lib/blog";
import { updateSession } from "@/lib/supabase/proxy";

// Proxy (antes "middleware"): se ejecuta antes de renderizar cada petición.
// 1) Devuelve un 404 real para artículos del blog que no existen (con Partial
//    Prefetching la página empezaría a enviarse con código 200).
// 2) Refresca la sesión de Supabase y protege la zona privada /app.

const blogSlugs = new Set(posts.map((p) => p.slug));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const blog = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blog && !blogSlugs.has(decodeURIComponent(blog[1]))) {
    // Reescribe a una ruta que no existe para servir la página 404 con su código correcto.
    return NextResponse.rewrite(new URL("/_no-encontrado", request.url));
  }

  const { response, userId } = await updateSession(request);

  // Sin sesión no se entra en /app: se manda a iniciar sesión y se vuelve después.
  if (!userId && (pathname === "/app" || pathname.startsWith("/app/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Todo menos archivos estáticos e imágenes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/|opengraph-image|robots.txt|sitemap.xml).*)"],
};
