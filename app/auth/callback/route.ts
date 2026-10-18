import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Aquí vuelve el usuario después de: entrar con Google, confirmar su email
// o pedir una contraseña nueva. Supabase envía un `code` que se cambia por la sesión.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
