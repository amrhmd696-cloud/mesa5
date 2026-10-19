import type { Topic } from "@/lib/ai/schema";

// Textos visibles para los temas, estados y ajustes de las reseñas.

export const TOPIC_LABELS: Record<Topic, string> = {
  comida: "Comida",
  servicio: "Servicio",
  espera: "Espera",
  precio: "Precio",
  limpieza: "Limpieza",
  ambiente: "Ambiente",
};

export const STATUS_LABELS = { pending: "Pendiente", answered: "Respondida" } as const;

export const ADJUSTMENT_LABELS = {
  shorter: "Más corta",
  warmer: "Más cálida",
  formal: "Más formal",
  regenerate: "Otra versión",
} as const;
