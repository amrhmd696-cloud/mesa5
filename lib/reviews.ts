import "server-only";
import type { RestaurantProfile } from "@/lib/ai/prompts";
import type { Workspace } from "@/lib/auth";
import { plans } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

// Datos compartidos por las páginas y las acciones de reseñas.

export type QuotaStatus = "ok" | "trial_expired" | "inactive" | "limit_reached";

/** Mensaje para el usuario cuando no puede usar la IA. */
export const QUOTA_MESSAGES: Record<Exclude<QuotaStatus, "ok">, string> = {
  trial_expired:
    "Tu prueba gratuita ha terminado. Elige un plan para seguir respondiendo con IA; tu historial sigue aquí.",
  inactive: "Tu suscripción no está activa (puede que haya un pago pendiente). Tu historial sigue aquí.",
  limit_reached: "Has llegado al límite de respuestas de tu plan este mes. Pásate a Pro para tener respuestas ilimitadas.",
};

/** Ficha del restaurante que la IA usa para escribir las respuestas. */
export async function loadProfile(restaurantId: string): Promise<RestaurantProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("name, cuisine, city, tone, signature, star_dishes, useful_info")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    cuisine: data.cuisine,
    city: data.city,
    tone: data.tone,
    signature: data.signature,
    starDishes: data.star_dishes ?? [],
    usefulInfo: (data.useful_info ?? {}) as Record<string, string>,
  };
}

export async function getQuotaStatus(orgId: string): Promise<QuotaStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reply_quota_status", { p_org_id: orgId });
  if (error) throw new Error(`reply_quota_status: ${error.message}`);
  return data as QuotaStatus;
}

/** Respuestas usadas este mes y el límite del plan (null = ilimitadas). */
export async function getMonthlyUsage(ws: Workspace): Promise<{ used: number; limit: number | null }> {
  const supabase = await createClient();
  const { data: month } = await supabase.rpc("current_usage_month");
  const { data } = await supabase
    .from("usage_monthly")
    .select("replies_count")
    .eq("org_id", ws.org.id)
    .eq("month", month as string)
    .maybeSingle();
  const limit = ws.org.plan === "trial" ? null : plans[ws.org.plan].monthlyReplies;
  return { used: data?.replies_count ?? 0, limit };
}
