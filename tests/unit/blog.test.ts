import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPost, getSortedPosts, posts } from "@/lib/blog";

describe("blog", () => {
  it("cada artículo registrado tiene su archivo .mdx", () => {
    for (const post of posts) {
      const file = path.join(process.cwd(), "content/blog", `${post.slug}.mdx`);
      expect(existsSync(file), file).toBe(true);
    }
  });

  it("los slugs son únicos y válidos para URL", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("las descripciones caben en el resultado de Google", () => {
    for (const p of posts) expect(p.description.length).toBeLessThanOrEqual(160);
  });

  it("ordena del más reciente al más antiguo y busca por slug", () => {
    const sorted = getSortedPosts();
    for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].date >= sorted[i].date).toBe(true);
    expect(getPost("no-existe")).toBeUndefined();
  });
});
