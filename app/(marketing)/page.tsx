import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Stars } from "@/components/ui/Stars";
import { formatEur, planFeatures, planList } from "@/lib/billing/plans";
import { absoluteUrl, siteConfig } from "@/lib/site";

// Landing de Mesa5. Cada bloque es una sección con su id para poder enlazarla
// desde el menú (/#como-funciona, /#precios, /#preguntas).

const BENEFITS = ["replies", "more", "insights", "mobile"] as const;
const BENEFIT_ICONS: Record<(typeof BENEFITS)[number], string> = {
  replies: "M4 5h16v10H8l-4 4z",
  more: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z",
  insights: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  mobile: "M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM11 18h2",
};
const STEPS = ["1", "2", "3"] as const;
const TESTIMONIALS = ["1", "2", "3"] as const;
const FAQ = ["1", "2", "3", "4", "5", "6", "7"] as const;

export default async function HomePage() {
  const t = await getTranslations();

  // Datos estructurados para Google (SoftwareApplication + FAQPage).
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: t("meta.description"),
      offers: planList.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: p.priceEur,
        priceCurrency: "EUR",
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((k) => ({
        "@type": "Question",
        name: t(`faq.items.${k}.q`),
        acceptedAnswer: { "@type": "Answer", text: t(`faq.items.${k}.a`) },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-2 md:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-sand px-3 py-1 text-sm font-medium text-ink-soft">
            <Stars rating={5} /> {t("hero.eyebrow")}
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 text-lg text-ink-soft">{t("hero.subtitle")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/registro">{t("hero.cta")}</ButtonLink>
            <ButtonLink href="#como-funciona" variant="secondary">{t("hero.ctaSecondary")}</ButtonLink>
          </div>
          <p className="mt-3 text-sm text-ink-soft">{t("hero.note")}</p>
        </div>

        {/* Ejemplo visual: reseña y respuesta */}
        <div className="relative" aria-label="Ejemplo de respuesta generada">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t("hero.demoReviewAuthor")}</span>
              <Stars rating={4} />
            </div>
            <p className="mt-2 text-ink-soft">“{t("hero.demoReview")}”</p>
          </div>
          <div className="-mt-2 ml-6 rounded-3xl border-2 border-brand/30 bg-surface p-5 shadow-md sm:ml-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t("hero.demoReplyLabel")}</p>
            <p className="mt-2">{t("hero.demoReply")}</p>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="bg-sand/60 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("benefits.title")}</h2>
          <p className="mt-3 text-ink-soft">{t("benefits.subtitle")}</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((k) => (
              <li key={k} className="rounded-2xl bg-surface p-6 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-9 w-9 rounded-xl bg-brand/10 p-1.5 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={BENEFIT_ICONS[k]} />
                </svg>
                <h3 className="mt-4 text-lg font-semibold">{t(`benefits.items.${k}.title`)}</h3>
                <p className="mt-2 text-ink-soft">{t(`benefits.items.${k}.text`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("how.title")}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((k) => (
            <li key={k} className="relative rounded-2xl border border-line bg-surface p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-star font-display text-lg font-bold text-ink">
                {k}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{t(`how.steps.${k}.title`)}</h3>
              <p className="mt-2 text-ink-soft">{t(`how.steps.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* HERRAMIENTA GRATUITA (se conecta en la fase 1G) */}
      <section id="probar" className="scroll-mt-20 bg-brand py-16 text-brand-ink">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("freeTool.title")}</h2>
          <p className="mt-3 opacity-90">{t("freeTool.subtitle")}</p>
          <p className="mx-auto mt-6 max-w-xl rounded-2xl bg-brand-ink/10 p-4 text-sm">{t("freeTool.comingSoon")}</p>
          <ButtonLink href="/registro" variant="secondary" className="mt-6">{t("hero.cta")}</ButtonLink>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("pricing.title")}</h2>
        <p className="mt-3 text-ink-soft">{t("pricing.subtitle")}</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {planList.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-3xl bg-surface p-6 ${plan.highlighted ? "border-2 border-brand shadow-lg" : "border border-line"}`}
            >
              {plan.highlighted && (
                <span className="mb-3 self-start rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-ink">
                  {t("pricing.popular")}
                </span>
              )}
              <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-4xl font-bold">{formatEur(plan.priceEur)}</span>
                <span className="text-ink-soft">{t("pricing.perMonth")}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {planFeatures(plan).map((f) => (
                  <li key={f} className="flex gap-2">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-olive" fill="currentColor" aria-hidden="true">
                      <path d="M8 13.2L4.8 10l-1.1 1.1L8 15.4l9-9-1.1-1.1z" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <ButtonLink href={`/registro?plan=${plan.id}`} variant={plan.highlighted ? "primary" : "secondary"} className="mt-8">
                {t("pricing.cta")}
              </ButtonLink>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-soft">{t("pricing.taxNote")}</p>
      </section>

      {/* TESTIMONIOS (placeholders) */}
      <section className="bg-sand/60 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("testimonials.title")}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((k) => (
              <figure key={k} className="rounded-2xl bg-surface p-6 shadow-sm">
                <Stars rating={5} />
                <blockquote className="mt-3">“{t(`testimonials.items.${k}.quote`)}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{t(`testimonials.items.${k}.name`)}</span>
                  <span className="text-ink-soft"> · {t(`testimonials.items.${k}.role`)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">{t("testimonials.placeholderNote")}</p>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("faq.title")}</h2>
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQ.map((k) => (
            <details key={k} className="group p-5">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {t(`faq.items.${k}.q`)}
                <span className="text-brand transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-ink-soft">{t(`faq.items.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-ink px-6 py-12 text-center text-cream">
          <Stars rating={5} className="justify-center" />
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{t("finalCta.title")}</h2>
          <p className="mt-3 opacity-80">{t("finalCta.text")}</p>
          <ButtonLink href="/registro" className="mt-8">{t("finalCta.cta")}</ButtonLink>
        </div>
      </section>
    </>
  );
}
