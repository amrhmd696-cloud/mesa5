import { z } from "zod";

// Formas de los datos que pedimos a la IA (salida JSON estructurada).
// Los límites (cuántas respuestas, longitud…) se comprueban después en
// check-reply.ts, porque el formato JSON de la API no admite todos.

export const TOPICS = ["comida", "servicio", "espera", "precio", "limpieza", "ambiente"] as const;
export type Topic = (typeof TOPICS)[number];

export const replyOutputSchema = z.object({
  language: z.string().describe("Código ISO 639-1 del idioma de la reseña, por ejemplo es, en, fr"),
  sentiment: z.enum(["positivo", "neutro", "negativo"]),
  topics: z.array(
    z.object({
      topic: z.enum(TOPICS),
      polarity: z.enum(["positivo", "negativo"]),
    }),
  ),
  replies: z.array(z.string()).describe("Exactamente dos respuestas distintas"),
});
export type ReplyOutput = z.infer<typeof replyOutputSchema>;

export const adjustOutputSchema = z.object({
  reply: z.string(),
});

export const ADJUSTMENTS = ["regenerate", "shorter", "warmer", "formal"] as const;
export type Adjustment = (typeof ADJUSTMENTS)[number];
