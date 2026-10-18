"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, recover, setNewPassword, signup } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "./fields";

// Formularios de acceso. Usan Server Actions: los datos se validan en el servidor.

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action] = useActionState(login, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <FormMessage state={state} />
      <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/recuperar" className="font-medium text-brand underline underline-offset-2">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <Field label="Tu nombre" name="fullName" autoComplete="name" placeholder="Carlos García" required />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="Mínimo 8 caracteres."
        required
      />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-5 w-5 accent-[var(--brand)]" />
        <span>
          Acepto los{" "}
          <Link href="/legal/terminos" className="text-brand underline" target="_blank">
            términos de servicio
          </Link>{" "}
          y la{" "}
          <Link href="/legal/privacidad" className="text-brand underline" target="_blank">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creando tu cuenta…">Crear cuenta gratis</SubmitButton>
    </form>
  );
}

export function RecoverForm() {
  const [state, action] = useActionState(recover, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email de tu cuenta" name="email" type="email" autoComplete="email" inputMode="email" required />
      <FormMessage state={state} />
      {!state?.ok && <SubmitButton pendingText="Enviando…">Enviar enlace</SubmitButton>}
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(setNewPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Contraseña nueva" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Field label="Repite la contraseña" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <FormMessage state={state} />
      <SubmitButton pendingText="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}
