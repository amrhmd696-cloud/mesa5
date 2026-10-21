"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

// Comentario privado desde la página pública. Sin sesión: la base de datos
// limita cuántos se pueden enviar (por conexión y por restaurante).

export type FeedbackState = { error?: string; ok?: boolean; values?: { message: string; contact: string } } | undefined;

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  message: z.string().trim().min(1, "Escribe tu comentario").max(2000, "El comentario es demasiado largo (máximo 2.000 caracteres)"),
  contact: z.string().trim().max(200, "El contacto es demasiado largo"),
  consent: z.boolean(),
});

/** Huella anónima de la conexión (no se guarda la IP). */
async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocida";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${h.get("user-agent") ?? ""}|${day}`).digest("hex").slice(0, 40);
}

export async function sendFeedbackAction(_: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const values = { message: String(formData.get("message") ?? ""), contact: String(formData.get("contact") ?? "") };
  // Campo trampa: las personas no lo ven; si viene relleno, es un robot.
  if (String(formData.get("web") ?? "") !== "") return { ok: true };

  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    message: values.message,
    contact: values.contact,
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  const { slug, message, contact, consent } = parsed.data;

  const { data, error } = await createPublicClient().rpc("submit_private_feedback", {
    p_slug: slug,
    p_message: message,
    p_contact: contact,
    p_consent: consent,
    p_client_key: await clientKey(),
  });
  if (error) {
    console.error("[comentario]", error.message);
    return { error: "No hemos podido enviarlo. Inténtalo de nuevo en un rato.", values };
  }
  if (data === "rate_limited") return { error: "Has enviado muchos comentarios seguidos. Inténtalo más tarde.", values };
  if (data !== "ok") return { error: "No encontramos este restaurante.", values };
  return { ok: true };
}
