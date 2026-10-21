"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendFeedbackAction, type FeedbackState } from "@/app/r/[slug]/actions";
import { FormMessage, SubmitButton } from "@/components/auth/fields";

// Comentario privado opcional. Va debajo del botón de Google y nunca en su lugar.
export function FeedbackForm({ slug, restaurantName }: { slug: string; restaurantName: string }) {
  const [state, action] = useActionState<FeedbackState, FormData>(sendFeedbackAction, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-olive/10 p-4 text-center text-olive">
        ¡Gracias! Tu comentario le ha llegado al equipo de {restaurantName}.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4 text-left">
      <input type="hidden" name="slug" value={slug} />
      {/* Campo trampa para robots: oculto para las personas */}
      <div aria-hidden="true" className="hidden">
        <label>
          Web <input name="web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-semibold">
          Tu comentario
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={2000}
          rows={4}
          defaultValue={state?.values?.message}
          className="mt-1.5 block w-full rounded-xl border border-line bg-surface px-4 py-3 text-base focus:border-brand focus:outline-2 focus:outline-brand/30"
        />
      </div>
      <div>
        <label htmlFor="contact" className="block text-sm font-semibold">
          Email o teléfono <span className="font-normal text-ink-soft">(opcional)</span>
        </label>
        <input
          id="contact"
          name="contact"
          maxLength={200}
          autoComplete="email"
          defaultValue={state?.values?.contact}
          className="mt-1.5 block min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base focus:border-brand focus:outline-2 focus:outline-brand/30"
        />
      </div>
      <label className="flex gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0 accent-brand" />
        Acepto que {restaurantName} me escriba para responder a mi comentario.
      </label>
      <FormMessage state={{ error: state?.error }} />
      <SubmitButton pendingText="Enviando…">Enviar en privado</SubmitButton>
      <p className="text-xs text-ink-soft">
        Solo lo verá el restaurante. Más información en la{" "}
        <Link href="/legal/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </form>
  );
}
