"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { z } from "zod";
import { findPromotionCode, getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { hasLiveSubscription, stripePriceIds } from "@/lib/billing/subscription";
import { getWorkspace } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Pagos: abrir Stripe Checkout para elegir plan y el portal de Stripe para
// gestionar la suscripción (tarjeta, facturas, cambio de plan, cancelar).

export type PlanFormState = { error?: string } | undefined;

const NOT_CONFIGURED = "Los pagos aún no están activados. Vuelve a intentarlo en un rato.";
const FOUNDER_TRIAL_DAYS = 30;

const checkoutSchema = z.object({
  plan: z.enum(["basic", "pro", "multi"]),
  code: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v.toUpperCase()),
});

/** URL de esta misma web (sirve igual en local, en las previews y en producción). */
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Solo el dueño de la organización puede pagar o cambiar el plan. */
async function requireOwner() {
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", ws.org.id)
    .eq("user_id", ws.user.id)
    .maybeSingle();
  return { ws, supabase, isOwner: data?.role === "owner" };
}

export async function startCheckoutAction(_: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const parsed = checkoutSchema.safeParse({ plan: formData.get("plan"), code: formData.get("code") ?? "" });
  if (!parsed.success) return { error: "Elige un plan." };
  const { plan, code } = parsed.data;

  const { ws, supabase, isOwner } = await requireOwner();
  if (!isOwner) return { error: "Solo el dueño de la cuenta puede elegir el plan." };
  if (!isStripeConfigured()) return { error: NOT_CONFIGURED };
  if (hasLiveSubscription(ws.org)) return { error: "Ya tienes un plan. Para cambiarlo, pulsa «Gestionar mi suscripción»." };

  const { data: allowed, error: rateError } = await supabase.rpc("check_user_rate_limit", {
    p_bucket: "pago",
    p_max: 10,
    p_window_seconds: 60,
  });
  if (rateError || allowed !== true) return { error: "Vas muy rápido. Espera un minuto y vuelve a intentarlo." };

  const stripe = getStripe();
  let url: string | null;
  try {
    // Socio fundador: el código se comprueba aquí (y no en la página de Stripe)
    // para darle además el primer mes gratis.
    let promo: Stripe.PromotionCode | null = null;
    if (code) {
      promo = await findPromotionCode(code);
      if (!promo) return { error: "Ese código no es válido o ya se ha usado." };
    }

    const customer = await getOrCreateCustomer(ws.org.id, ws.org.name, ws.user.email);
    const base = await baseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: ws.org.id,
      line_items: [{ price: stripePriceIds()[plan], quantity: 1 }],
      subscription_data: {
        metadata: { org_id: ws.org.id, ...(promo ? { founder: "1" } : {}) },
        ...(promo ? { trial_period_days: FOUNDER_TRIAL_DAYS } : {}),
      },
      ...(promo ? { discounts: [{ promotion_code: promo.id }] } : {}),
      // Para facturas a empresa (NIF y dirección).
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
      locale: "es",
      success_url: `${base}/app/plan?pago={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/app/plan`,
    });
    url = session.url;
  } catch (error) {
    console.error("[stripe] checkout", error instanceof Error ? error.message : error);
    return { error: "No hemos podido abrir la página de pago. Inténtalo de nuevo en unos segundos." };
  }
  if (!url) return { error: "No hemos podido abrir la página de pago." };
  redirect(url);
}

/** Cliente de Stripe de la organización; se crea la primera vez y se guarda. */
async function getOrCreateCustomer(orgId: string, orgName: string, email: string | null): Promise<string> {
  const admin = createAdminClient();
  const { data: org, error } = await admin.from("organizations").select("stripe_customer_id").eq("id", orgId).single();
  if (error) throw new Error(`organizations: ${error.message}`);
  if (org.stripe_customer_id) return org.stripe_customer_id;

  const customer = await getStripe().customers.create(
    { name: orgName, email: email ?? undefined, metadata: { org_id: orgId } },
    // Si se pulsa dos veces, Stripe devuelve el mismo cliente.
    { idempotencyKey: `customer-${orgId}` },
  );
  const { error: updateError } = await admin
    .from("organizations")
    .update({ stripe_customer_id: customer.id })
    .eq("id", orgId)
    .is("stripe_customer_id", null);
  if (updateError) throw new Error(`organizations update: ${updateError.message}`);
  return customer.id;
}

export async function openPortalAction(): Promise<void> {
  const { ws, isOwner } = await requireOwner();
  if (!isOwner || !isStripeConfigured()) redirect("/app/plan");

  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("stripe_customer_id").eq("id", ws.org.id).single();
  if (!org?.stripe_customer_id) redirect("/app/plan");

  let url: string;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${await baseUrl()}/app/plan`,
      locale: "es",
    });
    url = session.url;
  } catch (error) {
    console.error("[stripe] portal", error instanceof Error ? error.message : error);
    redirect("/app/plan?error=portal");
  }
  redirect(url);
}
