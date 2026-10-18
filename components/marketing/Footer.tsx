import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { siteConfig } from "@/lib/site";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");

  return (
    <footer className="border-t border-line bg-sand/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-ink-soft">{t("tagline")}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("product")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><Link className="hover:text-brand" href="/#como-funciona">{nav("how")}</Link></li>
            <li><Link className="hover:text-brand" href="/#precios">{nav("pricing")}</Link></li>
            <li><Link className="hover:text-brand" href="/blog">{nav("blog")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("legal")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><Link className="hover:text-brand" href="/legal/terminos">{t("terms")}</Link></li>
            <li><Link className="hover:text-brand" href="/legal/privacidad">{t("privacy")}</Link></li>
            <li><Link className="hover:text-brand" href="/legal/cookies">{t("cookies")}</Link></li>
            <li><a className="hover:text-brand" href={`mailto:${siteConfig.contactEmail}`}>{t("contact")}</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-line px-4 py-4 text-center text-xs text-ink-soft">
        © Mesa5. {t("rights")}
      </p>
    </footer>
  );
}
