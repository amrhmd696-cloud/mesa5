import type Stripe from "stripe";

// Qué eventos del webhook de Stripe nos interesan y a qué suscripción se refieren.

/** Id de la suscripción a la que se refiere el evento, si la hay. */
export function subscriptionIdFromEvent(event: Stripe.Event): string | null {
  const ref = (value: string | { id: string } | null | undefined) =>
    value ? (typeof value === "string" ? value : value.id) : null;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      return session.mode === "subscription" ? ref(session.subscription) : null;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return event.data.object.id;
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
      return ref(event.data.object.parent?.subscription_details?.subscription);
    default:
      return null;
  }
}
