import type { Metadata } from "next";
import Link from "next/link";
import { RecoverForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function RecoverPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">¿Olvidaste tu contraseña?</h1>
      <p className="mt-2 text-ink-soft">Te enviamos un enlace para crear una nueva.</p>
      <div className="mt-6">
        <RecoverForm />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-brand underline underline-offset-2">
          Volver a entrar
        </Link>
      </p>
    </>
  );
}
