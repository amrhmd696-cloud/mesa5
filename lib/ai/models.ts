// Modelos de IA y precios. Los nombres de los modelos salen de variables de
// entorno para poder cambiarlos sin tocar código (ver .env.example).

export const aiModels = {
  /** Respuestas, ajustes, herramienta gratuita y etiquetado de temas. */
  fast: process.env.AI_MODEL_FAST || "claude-haiku-5-5",
  /** Informe mensual (fase 2). */
  smart: process.env.AI_MODEL_SMART || "claude-opus-5-5",
};

// Precio en dólares por millón de tokens (entrada / salida).
const PRICES_USD: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

/** Coste estimado en euros. Si el modelo no está en la tabla, usa el precio de Opus para no quedarse corto. */
export function estimateCostEur(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES_USD[model] ?? PRICES_USD["claude-opus-5-5"];
  const usdToEur = Number(process.env.AI_USD_TO_EUR) || 0.9;
  const usd = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  return Math.round(usd * usdToEur * 1_000_000) / 1_000_000;
}
