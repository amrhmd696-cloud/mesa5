import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { checkReply, ensureSignature } from "@/lib/ai/check-reply";
import { aiModels, estimateCostEur } from "@/lib/ai/models";
import {
  SYSTEM_PROMPT,
  buildAdjustPrompt,
  buildReplyPrompt,
  type RestaurantProfile,
  type ReviewInput,
} from "@/lib/ai/prompts";
import { adjustOutputSchema, replyOutputSchema, type Adjustment, type ReplyOutput } from "@/lib/ai/schema";

// Llamadas a Claude para generar y ajustar respuestas. Cada respuesta pasa
// por checkReply(); si alguna falla, se pide otra vez una sola vez con las
// notas de lo que estaba mal.

export class AiError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "refused" | "invalid_output" | "api_error",
    /** Tokens ya gastados antes del fallo, para registrarlos igualmente. */
    readonly usage?: AiUsage,
  ) {
    super(message);
  }
}

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!isAiConfigured()) throw new AiError("Falta ANTHROPIC_API_KEY", "not_configured");
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 2 });
  return client;
}

function addUsage(total: AiUsage, model: string, usage: Anthropic.Usage): AiUsage {
  const inputTokens =
    total.inputTokens +
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  const outputTokens = total.outputTokens + usage.output_tokens;
  return { model, inputTokens, outputTokens, costEur: estimateCostEur(model, inputTokens, outputTokens) };
}

async function ask<S extends z.ZodType>(prompt: string, schema: S, maxTokens: number) {
  const model = aiModels.fast;
  try {
    const response = await getClient().messages.parse({
      model,
      max_tokens: maxTokens,
      // Tarea corta y repetitiva: poco esfuerzo = más rápido y barato.
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    });
    return {
      model,
      usage: response.usage,
      refused: response.stop_reason === "refusal",
      parsed: response.parsed_output as z.infer<S> | null,
    };
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof Anthropic.APIError) {
      console.error("[ia] error de la API", error.status, error.message);
      throw new AiError("La IA no está disponible ahora mismo.", "api_error");
    }
    throw error;
  }
}

export interface GeneratedReplies {
  language: string;
  sentiment: ReplyOutput["sentiment"];
  topics: ReplyOutput["topics"];
  replies: string[];
  usage: AiUsage;
}

/** Dos respuestas para una reseña, más el idioma, el sentimiento y los temas. */
export async function generateReplies(profile: RestaurantProfile, review: ReviewInput): Promise<GeneratedReplies> {
  let usage: AiUsage = { model: aiModels.fast, inputTokens: 0, outputTokens: 0, costEur: 0 };
  const accepted: string[] = [];
  let classification: Omit<ReplyOutput, "replies"> | null = null;
  let fixNotes: string[] | undefined;

  for (let attempt = 0; attempt < 2 && accepted.length < 2; attempt++) {
    const result = await ask(buildReplyPrompt(profile, review, fixNotes), replyOutputSchema, 2000);
    usage = addUsage(usage, result.model, result.usage);
    if (result.refused) throw new AiError("La IA no ha querido responder a esta reseña.", "refused", usage);
    if (!result.parsed) continue;
    classification ??= {
      language: result.parsed.language.slice(0, 10).toLowerCase(),
      sentiment: result.parsed.sentiment,
      topics: result.parsed.topics,
    };
    const notes: string[] = [];
    for (const raw of result.parsed.replies) {
      const reply = ensureSignature(raw, profile.signature);
      const check = checkReply(reply, profile);
      if (check.ok && !accepted.includes(reply)) accepted.push(reply);
      else notes.push(...check.issues);
    }
    fixNotes = [...new Set(notes)];
  }

  if (!classification || accepted.length === 0) {
    throw new AiError("No hemos conseguido una respuesta que cumpla las reglas.", "invalid_output", usage);
  }
  return { ...classification, replies: accepted.slice(0, 2), usage };
}

/** Una nueva versión de una respuesta: más corta, más cálida, más formal u otra distinta. */
export async function adjustReply(
  profile: RestaurantProfile,
  review: ReviewInput,
  currentReply: string,
  adjustment: Adjustment,
): Promise<{ reply: string; usage: AiUsage }> {
  let usage: AiUsage = { model: aiModels.fast, inputTokens: 0, outputTokens: 0, costEur: 0 };
  let fixNotes: string[] | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await ask(buildAdjustPrompt(profile, review, currentReply, adjustment, fixNotes), adjustOutputSchema, 1000);
    usage = addUsage(usage, result.model, result.usage);
    if (result.refused) throw new AiError("La IA no ha querido ajustar esta respuesta.", "refused", usage);
    if (!result.parsed) continue;
    const reply = ensureSignature(result.parsed.reply, profile.signature);
    const check = checkReply(reply, profile);
    if (check.ok) return { reply, usage };
    fixNotes = check.issues;
  }
  throw new AiError("No hemos conseguido una respuesta que cumpla las reglas.", "invalid_output", usage);
}
