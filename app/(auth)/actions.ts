"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { firstError, loginSchema, newPasswordSchema, recoverSchema, signupSchema } from "@/lib/validation/auth";

// Acciones de acceso (se ejecutan en el servidor).
// Devuelven { error } o { ok } para que el formulario muestre el mensaje.

export type AuthState = { error?: string; ok?: string } | undefined;

async function origin(): Promise<string> {
  const h = await headers();
  return h.get("origin") ?? siteConfig.url;
}

// Traduce los errores de Supabase a mensajes comprensibles.
function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Aún no has confirmado tu email. Revisa tu bandeja de entrada.";
  if (m.includes("already registered")) return "Ya existe una cuenta con este email. Prueba a iniciar sesión.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  if (m.includes("weak") || m.includes("password should")) return "Elige una contraseña más segura (mínimo 8 caracteres).";
  return "Algo ha fallado. Inténtalo de nuevo en unos segundos.";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translate(error.message) };

  redirect(safeNext(formData.get("next")));
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await origin()}/auth/callback?next=/app/onboarding`,
    },
  });
  if (error) return { error: translate(error.message) };

  // Si la confirmación de email está desactivada en Supabase, ya hay sesión.
  if (data.session) redirect("/app/onboarding");
  return { ok: `Te hemos enviado un email a ${parsed.data.email}. Pulsa el enlace para activar tu cuenta.` };
}

export async function loginWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function recover(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = recoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/nueva-contrasena`,
  });
  // Mismo mensaje exista o no la cuenta, para no revelar qué emails están registrados.
  return { ok: "Si existe una cuenta con ese email, te llegará un enlace para crear una contraseña nueva." };
}

export async function setNewPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: translate(error.message) };
  redirect("/app");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
