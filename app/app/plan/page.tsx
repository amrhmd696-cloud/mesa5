import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { openPortalAction } from "@/app/app/plan/actions";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { getWorkspace, requireUser } from "@/lib/auth";
import { formatEur, planFeatures, planList, plans } from "@/lib/billing/plans";
import { getStripe, isStripeConfigured, syncSubscription } from "@/lib/billing/stripe";
import { hasLiveSubscription } from "@/lib/billing/subscription";
import { trialDaysLeft } from "@/lib/billing/trial";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tu plan" };

const STATUS_TEXT: Record<string, string> = {
  active: "Activo",
  trialing: "Mes gratis de socio fundador",
  past_due: "Pago pendiente",
  unpaid: "Sin pagar",
  incomplete: "Pago sin completar",
  canceled: "Cancelado",
  expired: "Caducado",
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });
}

/**
 * Al volver de Stripe Checkout se guarda el plan en el momento, sin esperar al
 * webhook (que llega igualmente y repite lo mismo sin problema).
 */
async function syncCheckout(sessionId: string, orgId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !isStripeConfigured()) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    // Solo si el pago es de esta organización.
    if (session.client_reference_id !== orgId || session.status !== "complete" || !session.subscription) return false;
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    return (await syncSubscription(subId)) === orgId;
  } catch (error) {
    console.error("[stripe] volver de checkout", error instanceof Error ? error.message : error);
    return false;
  }
}

export default async function PlanPage({ searchParams }: PageProps<"/app/plan">) {
  await requireUser("/app/plan");
  const ws = await getWorkspace();
  if (!ws) redirect("/app/onboarding");

  const params = await searchParams;
  const sessionId = one(params.pago);
  const justPaid = sessionId ? await syncCheckout(sessionId, ws.org.id) : false;
  const portalError = one(params.error) === "portal";

  // Se lee de nuevo (no de getWorkspace) para ver el plan recién guardado.
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, subscription_status, trial_ends_at, current_period_end, stripe_customer_id, is_founder")
    .eq("id", ws.org.id)
    .single();
  if (!org) redirect("/app");

  const live = hasLiveSubscription({ plan: org.plan, subscriptionStatus: org.subscription_status });
  const paymentsReady = isStripeConfigured();
  const daysLeft = trialDaysLeft(org.trial_ends_at);
  const options = planList.map((p) => ({
    id: p.id,
    name: p.name,
    price: formatEur(p.priceEur),
    features: planFeatures(p),
    highlighted: p.highlighted,
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Tu plan</h1>

      {justPaid && (
        <p role="status" className="rounded-xl bg-olive/10 p-4 font-semibold text-olive">
          ¡Pago completado! Gracias por confiar en Mesa5.
        </p>
      )}
      {sessionId && !justPaid && (
        <p role="status" className="rounded-xl bg-star/10 p-4 text-sm">
          Estamos confirmando tu pago con Stripe. Si no ves tu plan en un minuto, recarga la página.
        </p>
      )}
      {portalError && (
        <p role="alert" className="rounded-xl bg-wine/10 p-3 text-sm text-wine">
          No hemos podido abrir la gestión de la suscripción. Inténtalo de nuevo en unos segundos.
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5" aria-label="Plan actual">
        {org.plan === "trial" ? (
          daysLeft > 0 ? (
            <>
              <p className="font-semibold">
                Prueba gratuita: te quedan {daysLeft} {daysLeft === 1 ? "día" : "días"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Tienes todas las funciones de Pro hasta el {formatDate(org.trial_ends_at)}. Elige un plan cuando quieras.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-wine">Tu prueba gratuita ha terminado</p>
              <p className="mt-1 text-sm text-ink-soft">
                Elige un plan para seguir respondiendo con IA. Tu historial y tu página de reseñas siguen funcionando.
              </p>
            </>
          )
        ) : (
          <>
            <p className="font-semibold">
              Plan {plans[org.plan as keyof typeof plans]?.name ?? org.plan}
              {org.is_founder && <span className="ml-2 rounded-full bg-star/20 px-2 py-0.5 text-xs">Socio fundador</span>}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {STATUS_TEXT[org.subscription_status] ?? org.subscription_status}
              {live && org.current_period_end && ` · Próxima renovación: ${formatDate(org.current_period_end)}`}
            </p>
            {org.subscription_status === "past_due" && (
              <p className="mt-3 rounded-xl bg-wine/10 p-3 text-sm text-wine">
                No hemos podido cobrar tu último pago. Actualiza tu tarjeta para no perder el acceso a la IA.
              </p>
            )}
          </>
        )}

        {org.stripe_customer_id && paymentsReady && (
          <form action={openPortalAction} className="mt-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full border border-ink/20 px-5 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              {live ? "Gestionar mi suscripción" : "Ver mis facturas"}
            </button>
            {live && <p className="mt-2 text-xs text-ink-soft">Cambiar de plan o de tarjeta, descargar facturas o cancelar.</p>}
          </form>
        )}
      </section>

      {!live &&
        (paymentsReady ? (
          <section aria-label="Elige tu plan" className="space-y-4">
            <h2 className="font-display text-xl font-bold">Elige tu plan</h2>
            <PlanPicker plans={options} />
          </section>
        ) : (
          <p className="rounded-xl bg-sand p-4 text-sm">Los pagos aún no están activados. Muy pronto podrás elegir tu plan aquí.</p>
        ))}
    </div>
  );
}
