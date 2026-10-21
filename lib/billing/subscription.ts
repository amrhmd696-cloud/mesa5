// Traduce una suscripción de Stripe a las columnas de la organización.
// Sin dependencias del servidor para poder probarlo con tests unitarios.

import type { PlanId } from "./plans";

export type OrgSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "expired";

/**
 * IDs de los precios de Stripe. Por defecto, los del entorno de prueba
 * (sandbox) de Mesa5; al pasar a cobros reales se ponen los nuevos en
 * STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO y STRIPE_PRICE_MULTI (Vercel).
 * No son secretos.
 */
export function stripePriceIds(): Record<PlanId, string> {
  return {
    basic: process.env.STRIPE_PRICE_BASIC || "price_1USwKcFPDWIsB8BjSizHrF78",
    pro: process.env.STRIPE_PRICE_PRO || "price_1USwLBFPDWIsB8Bjov0WI2SY",
    multi: process.env.STRIPE_PRICE_MULTI || "price_1USwLdFPDWIsB8BjzXt1meu0",
  };
}

export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const ids = stripePriceIds();
  return (Object.keys(ids) as PlanId[]).find((plan) => ids[plan] === priceId) ?? null;
}

/** Estados de Stripe → estados de Mesa5. Una suscripción pausada no puede usar la IA. */
export function mapStripeStatus(status: string): OrgSubscriptionStatus {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
      return status;
    case "incomplete_expired":
      return "expired";
    default:
      // "paused" y cualquier estado nuevo que añada Stripe: mejor bloquear.
      return "unpaid";
  }
}

/** Lo mínimo que usamos de una suscripción de Stripe. */
export interface StripeSubscriptionLike {
  id: string;
  status: string;
  customer: string | { id: string };
  metadata: Record<string, string> | null;
  items: { data: { price: { id: string }; current_period_end?: number | null }[] };
}

export interface OrgBillingUpdate {
  plan: PlanId;
  subscription_status: OrgSubscriptionStatus;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_end: string | null;
  is_founder?: true;
}

/**
 * Columnas a guardar en la organización, o null si la suscripción tiene un
 * precio que no es de ningún plan de Mesa5 (no se toca nada).
 */
export function subscriptionToOrgUpdate(sub: StripeSubscriptionLike): OrgBillingUpdate | null {
  const item = sub.items.data[0];
  const plan = planForPrice(item?.price.id);
  if (!plan) return null;
  const periodEnd = item?.current_period_end;
  const update: OrgBillingUpdate = {
    plan,
    subscription_status: mapStripeStatus(sub.status),
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };
  // Una vez fundador, siempre fundador (aunque luego cambie de plan).
  if (sub.metadata?.founder === "1") update.is_founder = true;
  return update;
}

/** ¿Tiene una suscripción viva que se gestiona desde el portal de Stripe? */
export function hasLiveSubscription(org: { plan: string; subscriptionStatus: string }): boolean {
  return org.plan !== "trial" && ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(org.subscriptionStatus);
}
