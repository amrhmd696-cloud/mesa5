import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { formatPostDate, getPost, posts } from "@/lib/blog";
import { absoluteUrl, siteConfig } from "@/lib/site";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  // Solo existen los artículos registrados en lib/blog.ts; el resto da 404.
  if (!post) notFound();

  const { default: Content } = await import(`@/content/blog/${slug}.mdx`);
  const t = await getTranslations("blog");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    url: absoluteUrl(`/blog/${post.slug}`),
    publisher: { "@type": "Organization", name: siteConfig.name },
    inLanguage: "es",
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/blog" className="text-sm font-medium text-brand">← {t("back")}</Link>
      <header className="mt-6">
        <p className="text-sm text-ink-soft">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight">{post.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{post.description}</p>
      </header>
      <div className="prose-mesa mt-10 text-[1.05rem]">
        <Content />
      </div>
      <aside className="mt-12 rounded-3xl bg-sand p-6 text-center">
        <h2 className="font-display text-2xl font-bold">{t("ctaTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("ctaText")}</p>
        <ButtonLink href="/registro" className="mt-5">Prueba gratis 14 días</ButtonLink>
      </aside>
    </article>
  );
}
