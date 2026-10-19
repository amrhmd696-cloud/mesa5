"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AiError, adjustReply, generateReplies, isAiConfigured, type AiUsage } from "@/lib/ai/replies";
import { ADJUSTMENTS } from "@/lib/ai/schema";
import { getWorkspace } from "@/lib/auth";
import { QUOTA_MESSAGES, getQuotaStatus, loadProfile } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";

// Acciones de reseñas. Cada llamada a la IA comprueba antes, en el servidor:
// sesión, plan activo, cuota del mes y límite de 20 peticiones por minuto.

export type ReviewFormState = { error?: string; ok?: string } | undefined;
/** Al fallar, devolvemos lo escrito para que el formulario no se vacíe. */
export type NewReviewState = { error?: string; values?: { authorName: string; text: string }; at?: number } | undefined;

const AI_RATE_LIMIT = { bucket: "ia", max: 20, windowSeconds: 60 };
const NOT_CONFIGURED = "La IA aún no está configurada en este servidor. Vuelve a intentarlo en un rato.";
const GENERIC_ERROR = "No hemos podido generar la respuesta. Inténtalo de nuevo en unos segundos.";

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Elige cuántas estrellas tiene la reseña").max(5),
  authorName: z
    .string()
    .trim()
    .max(120, "El nombre es demasiado largo")
    .transform((v) => (v === "" ? null : v)),
  text: z.string().trim().min(1, "Pega el texto de la reseña").max(5000, "La reseña es demasiado larga (máximo 5.000 caracteres)"),
});

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function underRateLimit(supabase: Supabase): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_user_rate_limit", {
    p_bucket: AI_RATE_LIMIT.bucket,
    p_max: AI_RATE_LIMIT.max,
    p_window_seconds: AI_RATE_LIMIT.windowSeconds,
  });
  if (error) throw new Error(`check_user_rate_limit: ${error.message}`);
  return data === true;
}

async function logUsage(supabase: Supabase, orgId: string, feature: "reply" | "adjust", usage: AiUsage | undefined) {
  if (!usage || (usage.inputTokens === 0 && usage.outputTokens === 0)) return;
  const { error } = await supabase.rpc("log_ai_usage", {
    p_org_id: orgId,
    p_feature: feature,
    p_model: usage.model,
    p_input_tokens: usage.inputTokens,
    p_output_tokens: usage.outputTokens,
    p_cost_eur: usage.costEur,
  });
  if (error) console.error("[ia] no se pudo registrar el uso", error.message);
}

function aiErrorMessage(error: unknown): string {
  if (error instanceof AiError) {
    if (error.code === "not_configured") return NOT_CONFIGURED;
    if (error.code === "refused") return "La IA no ha podido responder a esta reseña. Prueba a escribir la respuesta tú mismo.";
    if (error.code === "invalid_output") return "La IA no ha dado una respuesta que cumpla las reglas. Inténtalo otra vez.";
  }
  return GENERIC_ERROR;
}

/** Pegar reseña → dos respuestas guardadas en el historial. */
export async function generateRepliesAction(_: NewReviewState, formData: FormData): Promise<NewReviewState> {
  const values = { authorName: String(formData.get("authorName") ?? ""), text: String(formData.get("text") ?? "") };
  const result = await generateAndSave(formData);
  return result ? { ...result, values, at: Date.now() } : undefined;
}

async function generateAndSave(formData: FormData): Promise<ReviewFormState> {
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating") ?? "",
    authorName: formData.get("authorName") ?? "",
    text: formData.get("text") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const review = parsed.data;

  const supabase = await createClient();
  const status = await getQuotaStatus(ws.org.id);
  if (status !== "ok") return { error: QUOTA_MESSAGES[status] };
  if (!isAiConfigured()) return { error: NOT_CONFIGURED };
  if (!(await underRateLimit(supabase))) return { error: "Vas muy rápido. Espera un minuto y vuelve a intentarlo." };

  const profile = await loadProfile(ws.restaurant.id);
  if (!profile) redirect("/app/onboarding");

  let generated;
  try {
    generated = await generateReplies(profile, review);
  } catch (error) {
    console.error("[ia] generar", error instanceof Error ? error.message : error);
    await logUsage(supabase, ws.org.id, "reply", error instanceof AiError ? error.usage : undefined);
    return { error: aiErrorMessage(error) };
  }
  await logUsage(supabase, ws.org.id, "reply", generated.usage);

  const { data: reviewId, error } = await supabase.rpc("save_review_with_replies", {
    p_restaurant_id: ws.restaurant.id,
    p_author_name: review.authorName ?? "",
    p_rating: review.rating,
    p_text: review.text,
    p_language: generated.language,
    p_sentiment: generated.sentiment,
    p_topics: generated.topics,
    p_replies: generated.replies,
  });
  if (error) {
    if (error.message.includes("limit_reached")) return { error: QUOTA_MESSAGES.limit_reached };
    if (error.message.includes("trial_expired")) return { error: QUOTA_MESSAGES.trial_expired };
    if (error.message.includes("inactive")) return { error: QUOTA_MESSAGES.inactive };
    console.error("[reseñas] guardar", error.message);
    return { error: "No hemos podido guardar la reseña. Inténtalo de nuevo." };
  }
  redirect(`/app/resenas/${reviewId as string}`);
}

const adjustSchema = z.object({
  replyId: z.uuid(),
  adjustment: z.enum(ADJUSTMENTS),
});

/** Nueva versión de una respuesta (más corta, más cálida…). No gasta cuota. */
export async function adjustReplyAction(_: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");
  const parsed = adjustSchema.safeParse({ replyId: formData.get("replyId"), adjustment: formData.get("adjustment") });
  if (!parsed.success) return { error: "Petición no válida." };

  const supabase = await createClient();
  // RLS: solo encontramos la respuesta si es de un restaurante nuestro.
  const { data: current } = await supabase
    .from("replies")
    .select("text, review_id, reviews!inner(restaurant_id, author_name, rating, text)")
    .eq("id", parsed.data.replyId)
    .maybeSingle();
  if (!current) return { error: "No encontramos esa respuesta." };
  const review = current.reviews as unknown as { restaurant_id: string; author_name: string | null; rating: number; text: string };

  // Ajustar no consume cuota, pero sí exige un plan activo.
  const status = await getQuotaStatus(ws.org.id);
  if (status === "trial_expired" || status === "inactive") return { error: QUOTA_MESSAGES[status] };
  if (!isAiConfigured()) return { error: NOT_CONFIGURED };
  if (!(await underRateLimit(supabase))) return { error: "Vas muy rápido. Espera un minuto y vuelve a intentarlo." };

  const profile = await loadProfile(review.restaurant_id);
  if (!profile) return { error: "No encontramos el restaurante." };

  let adjusted;
  try {
    adjusted = await adjustReply(
      profile,
      { authorName: review.author_name, rating: review.rating, text: review.text },
      current.text,
      parsed.data.adjustment,
    );
  } catch (error) {
    console.error("[ia] ajustar", error instanceof Error ? error.message : error);
    await logUsage(supabase, ws.org.id, "adjust", error instanceof AiError ? error.usage : undefined);
    return { error: aiErrorMessage(error) };
  }
  await logUsage(supabase, ws.org.id, "adjust", adjusted.usage);

  const { error } = await supabase.rpc("add_reply_version", {
    p_review_id: current.review_id,
    p_text: adjusted.reply,
    p_adjustment: parsed.data.adjustment,
  });
  if (error) {
    if (error.message.includes("too_many_versions")) return { error: "Ya hay 20 versiones de esta respuesta. Elige una o edítala tú." };
    console.error("[reseñas] nueva versión", error.message);
    return { error: "No hemos podido guardar la nueva versión." };
  }
  refresh();
  return { ok: "Nueva versión lista." };
}

/** Marca una respuesta como la elegida (la que el dueño publica en Google). */
export async function selectReplyAction(_: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");
  const replyId = z.uuid().safeParse(formData.get("replyId"));
  if (!replyId.success) return { error: "Petición no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("select_reply", { p_reply_id: replyId.data });
  if (error) {
    console.error("[reseñas] elegir", error.message);
    return { error: "No hemos podido marcarla como publicada." };
  }
  refresh();
  return { ok: "Marcada como publicada." };
}

/** Borra una reseña del historial (con sus respuestas). */
export async function deleteReviewAction(formData: FormData): Promise<void> {
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");
  const reviewId = z.uuid().safeParse(formData.get("reviewId"));
  if (reviewId.success) {
    const supabase = await createClient();
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId.data);
    if (error) console.error("[reseñas] borrar", error.message);
  }
  redirect("/app/resenas");
}
