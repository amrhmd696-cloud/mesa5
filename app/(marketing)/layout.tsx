import { getTranslations } from "next-intl/server";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { CookieNotice } from "@/components/marketing/CookieNotice";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("cookies");
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="flex-1">{children}</main>
      <Footer />
      <CookieNotice text={t("text")} more={t("more")} accept={t("accept")} />
    </>
  );
}
