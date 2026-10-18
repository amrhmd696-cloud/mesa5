import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";

export async function Header() {
  const t = await getTranslations("nav");
  const links = [
    { href: "/#como-funciona", label: t("how") },
    { href: "/#precios", label: t("pricing") },
    { href: "/#preguntas", label: t("faq") },
    { href: "/blog", label: t("blog") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Mesa5, inicio">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-soft hover:text-brand">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-3 text-sm font-medium text-ink-soft hover:text-brand sm:inline">
            {t("login")}
          </Link>
          <ButtonLink href="/registro" className="min-h-10 px-4 text-sm">
            {t("cta")}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
