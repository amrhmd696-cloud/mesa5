// Definición de los planes de Mesa5.
// Los precios que se muestran salen de variables de entorno (NEXT_PUBLIC_PRICE_*_EUR)
// para poder cambiarlos sin tocar código. Los límites se aplicarán en el backend
// (fase 1F) leyendo este mismo archivo, así la web y el servidor nunca discrepan.

export type PlanId = "basic" | "pro" | "multi";

export interface Plan {
  id: PlanId;
  name: string;
  priceEur: number;
  maxLocations: number;
  /** null = ilimitadas */
  monthlyReplies: number | null;
  monthlyReport: boolean;
  alerts: boolean;
  reviewKit: boolean;
  highlighted?: boolean;
}

function priceFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const plans: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "Básico",
    priceEur: priceFromEnv(process.env.NEXT_PUBLIC_PRICE_BASIC_EUR, 19),
    maxLocations: 1,
    monthlyReplies: 60,
    monthlyReport: false,
    alerts: false,
    reviewKit: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceEur: priceFromEnv(process.env.NEXT_PUBLIC_PRICE_PRO_EUR, 39),
    maxLocations: 1,
    monthlyReplies: null,
    monthlyReport: true,
    alerts: true,
    reviewKit: true,
    highlighted: true,
  },
  multi: {
    id: "multi",
    name: "Multi-local",
    priceEur: priceFromEnv(process.env.NEXT_PUBLIC_PRICE_MULTI_EUR, 79),
    maxLocations: 5,
    monthlyReplies: null,
    monthlyReport: true,
    alerts: true,
    reviewKit: true,
  },
};

export const planList: Plan[] = [plans.basic, plans.pro, plans.multi];

/** Lista de ventajas legibles para la tabla de precios. */
export function planFeatures(plan: Plan): string[] {
  const features = [
    plan.maxLocations === 1 ? "1 local" : `Hasta ${plan.maxLocations} locales`,
    plan.monthlyReplies === null
      ? "Respuestas ilimitadas"
      : `${plan.monthlyReplies} respuestas al mes`,
    "Kit de reseñas: QR, página y WhatsApp",
    "Historial y temas de cada reseña",
  ];
  if (plan.monthlyReport) features.push("Informe mensual con IA");
  if (plan.alerts) features.push("Alertas de reseñas negativas");
  return features;
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
