import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Capa de acceso a datos de la sesión. Todas las páginas privadas y las
// Server Actions pasan por aquí, para comprobar siempre en el servidor quién
// es el usuario (nunca se confía en lo que diga el navegador).

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

export interface Workspace {
  user: CurrentUser;
  org: {
    id: string;
    name: string;
    plan: "trial" | "basic" | "pro" | "multi";
    subscriptionStatus: string;
    trialEndsAt: string;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
    tone: "cercano" | "formal" | "divertido";
    signature: string | null;
    city: string | null;
  };
}

/** Usuario actual o null. Se memoriza durante la petición. */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", claims.sub).maybeSingle();
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    fullName: profile?.full_name ?? null,
  };
});

/** Usuario actual; si no hay sesión, manda a /login. */
export async function requireUser(next = "/app"): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Organización y restaurante del usuario. Si aún no ha hecho el onboarding,
 * devuelve null (la zona privada le manda a /app/onboarding).
 */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  // RLS garantiza que solo vemos restaurantes de nuestras organizaciones.
  const { data } = await supabase
    .from("restaurants")
    .select("id, name, slug, tone, signature, city, organizations!inner(id, name, plan, subscription_status, trial_ends_at)")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const org = data.organizations as unknown as {
    id: string;
    name: string;
    plan: Workspace["org"]["plan"];
    subscription_status: string;
    trial_ends_at: string;
  };
  return {
    user,
    org: {
      id: org.id,
      name: org.name,
      plan: org.plan,
      subscriptionStatus: org.subscription_status,
      trialEndsAt: org.trial_ends_at,
    },
    restaurant: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      tone: data.tone,
      signature: data.signature,
      city: data.city,
    },
  };
});

/** Evita redirecciones a otras webs: solo rutas internas como "/app". */
export function safeNext(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
