import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatPostDate, getSortedPosts } from "@/lib/blog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/blog" },
    openGraph: { title: t("title"), description: t("subtitle"), url: "/blog" },
  };
}

export default async function BlogIndexPage() {
  const t = await getTranslations("blog");
  const posts = getSortedPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("subtitle")}</p>
      <ul className="mt-10 space-y-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="relative rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-brand">
              <p className="text-sm text-ink-soft">
                <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 hover:text-brand">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-ink-soft">{post.description}</p>
              <span className="mt-3 inline-block font-semibold text-brand">{t("readMore")} →</span>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
