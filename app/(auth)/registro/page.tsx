import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/AuthForms";
import { Divider, GoogleButton } from "@/components/auth/GoogleButton";

export const metadata: Metadata = {
  title: "Prueba gratis 14 días",
  description: "Crea tu cuenta de Mesa5 en menos de 3 minutos. Sin tarjeta.",
};

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Empieza tu prueba gratis</h1>
      <p className="mt-2 text-ink-soft">14 días con todas las funciones. Sin tarjeta.</p>
      <div className="mt-6 space-y-5">
        <GoogleButton next="/app/onboarding" />
        <Divider />
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand underline underline-offset-2">
          Entra
        </Link>
      </p>
    </>
  );
}
