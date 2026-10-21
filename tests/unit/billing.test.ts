import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscriptionIdFromEvent } from "@/lib/billing/events";
import {
  hasLiveSubscription,
  mapStripeStatus,
  planForPrice,
  stripePriceIds,
  subscriptionToOrgUpdate,
  type StripeSubscriptionLike,
} from "@/lib/billing/subscription";

function sub(overrides: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike {
  return {
    id: "sub_1",
    status: "active",
    customer: "cus_1",
    metadata: { org_id: "org-1" },
    items: { data: [{ price: { id: stripePriceIds().pro }, current_period_end: 1_800_000_000 }] },
    ...overrides,
  };
}

describe("suscripciones de Stripe → organización", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reconoce el plan por el precio", () => {
    expect(planForPrice(stripePriceIds().basic)).toBe("basic");
    expect(planForPrice(stripePriceIds().multi)).toBe("multi");
    expect(planForPrice("price_de_otra_cosa")).toBeNull();
    expect(planForPrice(null)).toBeNull();
  });

  it("los precios se pueden cambiar por variables de entorno (cobros reales)", () => {
    vi.stubEnv("STRIPE_PRICE_PRO", "price_live_pro");
    expect(planForPrice("price_live_pro")).toBe("pro");
  });

  it("traduce los estados de Stripe y bloquea los desconocidos", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("incomplete_expired")).toBe("expired");
    expect(mapStripeStatus("paused")).toBe("unpaid");
    expect(mapStripeStatus("algo_nuevo")).toBe("unpaid");
  });

  it("construye las columnas a guardar", () => {
    expect(subscriptionToOrgUpdate(sub())).toEqual({
      plan: "pro",
      subscription_status: "active",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
    });
  });

  it("marca al socio fundador y acepta el cliente expandido", () => {
    const update = subscriptionToOrgUpdate(sub({ customer: { id: "cus_2" }, metadata: { org_id: "o", founder: "1" }, status: "trialing" }));
    expect(update?.is_founder).toBe(true);
    expect(update?.stripe_customer_id).toBe("cus_2");
    expect(update?.subscription_status).toBe("trialing");
  });

  it("ignora suscripciones con precios que no son de Mesa5", () => {
    expect(subscriptionToOrgUpdate(sub({ items: { data: [{ price: { id: "price_x" } }] } }))).toBeNull();
  });

  it("sabe si hay una suscripción que gestionar en el portal", () => {
    expect(hasLiveSubscription({ plan: "trial", subscriptionStatus: "trialing" })).toBe(false);
    expect(hasLiveSubscription({ plan: "pro", subscriptionStatus: "active" })).toBe(true);
    expect(hasLiveSubscription({ plan: "basic", subscriptionStatus: "past_due" })).toBe(true);
    expect(hasLiveSubscription({ plan: "basic", subscriptionStatus: "canceled" })).toBe(false);
  });
});

describe("eventos del webhook", () => {
  const ev = (type: string, object: unknown) => ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;

  it("saca la suscripción de cada tipo de evento", () => {
    expect(subscriptionIdFromEvent(ev("checkout.session.completed", { mode: "subscription", subscription: "sub_a" }))).toBe("sub_a");
    expect(subscriptionIdFromEvent(ev("checkout.session.completed", { mode: "payment", subscription: null }))).toBeNull();
    expect(subscriptionIdFromEvent(ev("customer.subscription.deleted", { id: "sub_b" }))).toBe("sub_b");
    expect(
      subscriptionIdFromEvent(ev("invoice.payment_failed", { parent: { subscription_details: { subscription: { id: "sub_c" } } } })),
    ).toBe("sub_c");
    expect(subscriptionIdFromEvent(ev("invoice.paid", { parent: null }))).toBeNull();
    expect(subscriptionIdFromEvent(ev("customer.created", { id: "cus_1" }))).toBeNull();
  });
});

// ── La ruta del webhook, con Stripe y Supabase simulados ──
const sync = vi.fn<(id: string) => Promise<string | null>>();
const seen = new Set<string>();
const inserted: string[] = [];
const realStripe = new Stripe("sk_test_falsa");
const SECRET = "whsec_prueba";

vi.mock("@/lib/billing/stripe", () => ({
  isStripeConfigured: () => true,
  getStripe: () => realStripe,
  syncSubscription: (id: string) => sync(id),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_: string, id: string) => ({ maybeSingle: async () => ({ data: seen.has(id) ? { id } : null }) }),
      }),
      insert: async ({ id }: { id: string }) => {
        inserted.push(id);
        seen.add(id);
        return { error: null };
      },
    }),
  }),
}));

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    sync.mockReset().mockResolvedValue("org-1");
    seen.clear();
    inserted.length = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  function signed(payload: object, secret = SECRET) {
    const body = JSON.stringify(payload);
    const signature = realStripe.webhooks.generateTestHeaderString({ payload: body, secret });
    return new Request("http://localhost/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": signature } });
  }
  const event = { id: "evt_123", object: "event", type: "customer.subscription.updated", data: { object: { id: "sub_9" } } };

  it("rechaza peticiones sin firma o con una firma falsa", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const noSig = await POST(new Request("http://localhost/x", { method: "POST", body: JSON.stringify(event) }));
    expect(noSig.status).toBe(400);
    const badSig = await POST(signed(event, "whsec_otra"));
    expect(badSig.status).toBe(400);
    expect(sync).not.toHaveBeenCalled();
  });

  it("procesa un evento firmado y lo apunta", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(signed(event));
    expect(res.status).toBe(200);
    expect(sync).toHaveBeenCalledWith("sub_9");
    expect(inserted).toEqual(["evt_123"]);
  });

  it("no repite un evento ya procesado", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    await POST(signed(event));
    const again = await POST(signed(event));
    expect(again.status).toBe(200);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("si falla la sincronización responde 500 para que Stripe reintente, sin apuntarlo", async () => {
    sync.mockRejectedValue(new Error("caída"));
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(signed(event));
    expect(res.status).toBe(500);
    expect(inserted).toEqual([]);
  });

  it("sin STRIPE_WEBHOOK_SECRET no acepta nada", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const { POST } = await import("@/app/api/stripe/webhook/route");
    expect((await POST(signed(event))).status).toBe(503);
  });
});
