import type Stripe from "stripe";
import { subscriptionIdFromEvent } from "@/lib/billing/events";
import { getStripe, isStripeConfigured, syncSubscription } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook de Stripe: Stripe nos avisa aquí de pagos, cambios de plan,
// impagos y cancelaciones. La firma se comprueba SIEMPRE con
// STRIPE_WEBHOOK_SECRET; sin firma válida no se toca nada.

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !isStripeConfigured()) {
    console.error("[stripe] webhook sin configurar (STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, SUPABASE_SECRET_KEY)");
    return new Response("not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  // La firma se calcula sobre el cuerpo exacto: hay que leerlo como texto.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return Response.json({ received: true, duplicate: true });

  const subscriptionId = subscriptionIdFromEvent(event);
  if (subscriptionId) {
    try {
      await syncSubscription(subscriptionId);
    } catch (error) {
      console.error("[stripe] error al sincronizar", event.type, error instanceof Error ? error.message : error);
      // 500 → Stripe reintentará el evento más tarde.
      return new Response("sync failed", { status: 500 });
    }
  }

  // Se apunta al final: si algo falla antes, el reintento de Stripe lo procesa.
  const { error } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (error && error.code !== "23505") console.error("[stripe] no se pudo apuntar el evento", error.message);
  return Response.json({ received: true });
}
