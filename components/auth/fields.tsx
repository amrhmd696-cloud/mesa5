"use client";

import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, ReactNode } from "react";

// Piezas de formulario reutilizables (acceso y onboarding).
// Campos grandes (48px) y con etiqueta visible, pensados para el móvil.

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  const id = props.id ?? props.name;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-1.5 block min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-2 focus:outline-brand/30"
      />
      {hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function SubmitButton({ children, pendingText }: { children: ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand px-6 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-strong disabled:opacity-60"
    >
      {pending ? (pendingText ?? "Un momento…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-xl bg-wine/10 p-3 text-sm text-wine">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="rounded-xl bg-olive/10 p-3 text-sm text-olive">
        {state.ok}
      </p>
    );
  return null;
}
