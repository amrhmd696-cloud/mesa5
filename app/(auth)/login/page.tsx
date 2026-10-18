import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/AuthForms";
import { Divider, GoogleButton } from "@/components/auth/GoogleButton";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

const ERRORS: Record<string, string> = {
  enlace: "El enlace no es válido o ha caducado. Vuelve a intentarlo.",
  google: "No hemos podido conectar con Google. Inténtalo de nuevo.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Entra en Mesa5</h1>
      <p className="mt-2 text-ink-soft">Responde tus reseñas en segundos.</p>
      <Suspense fallback={<div className="mt-6 h-72" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-brand underline underline-offset-2">
          Prueba gratis 14 días
        </Link>
      </p>
    </>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  return (
    <div className="mt-6 space-y-5">
      <GoogleButton next={next} />
      <Divider />
      <LoginForm next={next} initialError={error} />
    </div>
  );
}
