"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startCheckoutAction, type PlanFormState } from "@/app/app/plan/actions";
import { FormMessage } from "@/components/auth/fields";
import type { PlanId } from "@/lib/billing/plans";

export interface PlanOption {
  id: PlanId;
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

// Tarjetas de los planes. Un solo formulario: el botón pulsado dice qué plan
// se elige, y el código de socio fundador (opcional) vale para cualquiera.
export function PlanPicker({ plans }: { plans: PlanOption[] }) {
  const [state, action] = useActionState<PlanFormState, FormData>(startCheckoutAction, undefined);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-2xl border bg-surface p-5 ${plan.highlighted ? "border-brand ring-2 ring-brand/20" : "border-line"}`}
          >
            <h3 className="font-display text-xl font-bold">{plan.name}</h3>
            <p className="mt-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-sm text-ink-soft"> /mes</span>
            </p>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden="true" className="text-olive">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <ChooseButton plan={plan} />
          </div>
        ))}
      </div>

      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">¿Tienes un código de socio fundador?</summary>
        <label htmlFor="code" className="mt-3 block text-sm text-ink-soft">
          Escríbelo aquí y elige tu plan: tendrás el primer mes gratis y un 30 % de descuento para siempre.
        </label>
        <input
          id="code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={40}
          className="mt-2 block min-h-12 w-full rounded-xl border border-line bg-cream px-4 text-base uppercase focus:border-brand focus:outline-2 focus:outline-brand/30 sm:max-w-xs"
        />
      </details>

      <FormMessage state={state} />
      <p className="text-sm text-ink-soft">
        El pago se hace en Stripe, de forma segura. Puedes cambiar de plan o cancelar cuando quieras, sin permanencia.
      </p>
    </form>
  );
}

function ChooseButton({ plan }: { plan: PlanOption }) {
  const { pending, data } = useFormStatus();
  const isThis = pending && data?.get("plan") === plan.id;
  return (
    <button
      type="submit"
      name="plan"
      value={plan.id}
      disabled={pending}
      className={`mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 font-semibold transition-colors disabled:opacity-60 ${
        plan.highlighted ? "bg-brand text-brand-ink hover:bg-brand-strong" : "border border-ink/20 hover:border-brand hover:text-brand"
      }`}
    >
      {isThis ? "Abriendo el pago…" : `Elegir ${plan.name}`}
    </button>
  );
}
