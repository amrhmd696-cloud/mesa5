import "server-only";
import Stripe from "stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { subscriptionToOrgUpdate } from "./subscription";

// Cliente de Stripe y sincronización de suscripciones con la base de datos.
// La clave secreta (STRIPE_SECRET_KEY) solo existe en el servidor (Vercel).

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY) && isSupabaseAdminConfigured();
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY (mira .env.example)");
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "Mesa5" } });
  return client;
}

const DEAD_STATUSES = new Set(["canceled", "incomplete_expired"]);

/**
 * Lee la suscripción en Stripe (siempre la versión actual, así no importa en
 * qué orden lleguen los webhooks) y guarda plan y estado en la organización.
 * Devuelve el id de la organización actualizada, o null si no corresponde a ninguna.
 */
export async function syncSubscription(subscriptionId: string): Promise<string | null> {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const update = subscriptionToOrgUpdate(sub);
  if (!update) {
    console.warn("[stripe] suscripción con un precio que no es de Mesa5", subscriptionId);
    return null;
  }

  const admin = createAdminClient();
  // La organización se guarda en los metadatos al crear el pago; si no, por el cliente.
  const orgId = sub.metadata?.org_id;
  const query = admin.from("organizations").select("id, stripe_subscription_id");
  const { data: org, error } = orgId
    ? await query.eq("id", orgId).maybeSingle()
    : await query.eq("stripe_customer_id", update.stripe_customer_id).maybeSingle();
  if (error) throw new Error(`organizations: ${error.message}`);
  if (!org) {
    console.warn("[stripe] suscripción sin organización", subscriptionId);
    return null;
  }

  // Si ya tiene otra suscripción, una antigua que se cancela no debe pisarla.
  if (org.stripe_subscription_id && org.stripe_subscription_id !== sub.id && DEAD_STATUSES.has(sub.status)) {
    return org.id;
  }

  const { error: updateError } = await admin.from("organizations").update(update).eq("id", org.id);
  if (updateError) throw new Error(`organizations update: ${updateError.message}`);
  return org.id;
}

/** Busca el código de socio fundador (activo y con usos libres) en Stripe. */
export async function findPromotionCode(code: string): Promise<Stripe.PromotionCode | null> {
  const { data } = await getStripe().promotionCodes.list({ code, active: true, limit: 1 });
  const promo = data[0];
  if (!promo) return null;
  if (promo.max_redemptions !== null && promo.times_redeemed >= promo.max_redemptions) return null;
  if (promo.expires_at !== null && promo.expires_at * 1000 <= Date.now()) return null;
  return promo;
}
