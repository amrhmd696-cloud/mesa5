import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";

// Página provisional. En la fase 1B se sustituye por el registro real con Supabase.
export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default async function SignupPlaceholderPage() {
  const t = await getTranslations("signup");
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <LogoMark className="mx-auto h-20 w-20" />
      <h1 className="mt-6 font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("text")}</p>
      <ButtonLink href="/" variant="secondary" className="mt-8">Volver al inicio</ButtonLink>
    </div>
  );
}
