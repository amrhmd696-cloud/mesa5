"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { adjustReplyAction, selectReplyAction } from "@/app/app/resenas/actions";
import { FormMessage } from "@/components/auth/fields";
import { ADJUSTMENT_LABELS } from "@/lib/ai/labels";

// Una versión de la respuesta: copiar, pedir otra versión o marcarla como publicada.

export interface ReplyView {
  id: string;
  version: number;
  text: string;
  adjustment: keyof typeof ADJUSTMENT_LABELS | null;
  isSelected: boolean;
}

export function ReplyCard({ reply, canUseAi }: { reply: ReplyView; canUseAi: boolean }) {
  const [adjustState, adjust] = useActionState(adjustReplyAction, undefined);
  const [selectState, select] = useActionState(selectReplyAction, undefined);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reply.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: seleccionamos el texto para copiarlo a mano.
      const el = document.getElementById(`respuesta-${reply.id}`);
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-surface p-4 sm:p-5 ${reply.isSelected ? "border-olive ring-2 ring-olive/30" : "border-line"}`}
      aria-label={`Versión ${reply.version}`}
    >
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Versión {reply.version}</span>
        {reply.adjustment && <span className="text-ink-soft">· {ADJUSTMENT_LABELS[reply.adjustment]}</span>}
        {reply.isSelected && (
          <span className="ml-auto rounded-full bg-olive/15 px-2.5 py-0.5 text-xs font-semibold text-olive">Publicada</span>
        )}
      </header>

      <p id={`respuesta-${reply.id}`} className="mt-3 whitespace-pre-line text-base leading-relaxed">
        {reply.text}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-ink hover:bg-brand-strong"
        >
          {copied ? "¡Copiada!" : "Copiar"}
        </button>
        {!reply.isSelected && (
          <form action={select}>
            <input type="hidden" name="replyId" value={reply.id} />
            <PendingButton pendingText="Guardando…">Marcar como publicada</PendingButton>
          </form>
        )}
      </div>

      {canUseAi && (
        <form action={adjust} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="replyId" value={reply.id} />
          {(Object.keys(ADJUSTMENT_LABELS) as (keyof typeof ADJUSTMENT_LABELS)[]).map((key) => (
            <PendingButton key={key} name="adjustment" value={key} variant="ghost">
              {ADJUSTMENT_LABELS[key]}
            </PendingButton>
          ))}
        </form>
      )}

      <div className="mt-3 space-y-2" aria-live="polite">
        <FormMessage state={adjustState?.error ? adjustState : undefined} />
        <FormMessage state={selectState?.error ? selectState : undefined} />
      </div>
    </article>
  );
}

function PendingButton({
  children,
  pendingText,
  variant = "secondary",
  ...props
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "secondary" | "ghost";
  name?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  // Si el formulario tiene varios botones, solo el pulsado muestra "Escribiendo…".
  const isThis = pending && (!props.name || data?.get(props.name) === props.value);
  return (
    <button
      type="submit"
      disabled={pending}
      {...props}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium disabled:opacity-60 ${
        variant === "ghost" ? "border-line bg-cream hover:border-brand" : "border-line bg-surface hover:border-brand"
      }`}
    >
      {isThis ? (pendingText ?? "Escribiendo…") : children}
    </button>
  );
}
