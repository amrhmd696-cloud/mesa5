import { expect, test } from "@playwright/test";

test.describe("landing", () => {
  test("muestra el titular, las secciones y el botón de prueba", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Responde todas tus reseñas de Google en segundos y consigue más clientes",
    );
    await expect(page.getByRole("link", { name: "Prueba gratis 14 días" }).first()).toBeVisible();
    for (const h of ["Cómo funciona en 3 pasos", "Precios claros, sin permanencia", "Preguntas frecuentes", "Lo que dicen los restaurantes"]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
  });

  test("muestra los tres planes con sus precios", async ({ page }) => {
    await page.goto("/");
    const pricing = page.locator("#precios");
    for (const plan of ["Básico", "Pro", "Multi-local"]) {
      await expect(pricing.getByRole("heading", { name: plan, exact: true })).toBeVisible();
    }
    await expect(pricing).toContainText("19 €");
    await expect(pricing).toContainText("39 €");
    await expect(pricing).toContainText("79 €");
  });

  test("no tiene scroll horizontal en móvil", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("abre y cierra una pregunta frecuente", async ({ page }) => {
    await page.goto("/");
    const q = page.getByText("¿Necesito tarjeta para la prueba gratuita?");
    await q.click();
    await expect(page.getByText("No. Pruebas Mesa5 durante 14 días")).toBeVisible();
  });

  test("el aviso de cookies se cierra y no vuelve", async ({ page }) => {
    await page.goto("/");
    const notice = page.getByRole("region", { name: "Aviso de cookies" });
    await expect(notice).toBeVisible();
    await notice.getByRole("button", { name: "Entendido" }).click();
    await expect(notice).toBeHidden();
    await page.reload();
    await expect(notice).toBeHidden();
  });

  test("tiene metadatos SEO y Open Graph", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Mesa5/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /reseñas/);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});

test.describe("blog y páginas legales", () => {
  test("lista artículos y abre uno", async ({ page }) => {
    await page.goto("/blog");
    await page.getByRole("link", { name: /Cómo responder una reseña negativa/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cómo responder una reseña negativa");
    await expect(page.getByRole("heading", { name: "La estructura que funciona" })).toBeVisible();
  });

  test("un artículo inexistente da 404", async ({ page }) => {
    const res = await page.goto("/blog/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Esta mesa no está reservada" })).toBeVisible();
  });

  for (const [path, title, hasTable] of [
    ["/legal/terminos", "Términos de servicio", false],
    ["/legal/privacidad", "Política de privacidad", true],
    ["/legal/cookies", "Política de cookies", true],
  ] as const) {
    test(`carga ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.getByText("Plantilla pendiente de revisión.")).toBeVisible();
      if (hasTable) await expect(page.locator("table").first()).toBeVisible();
    });
  }

  test("sitemap y robots", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/blog/como-conseguir-mas-resenas-google-restaurante");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /app/");
  });
});

test.describe("acceso", () => {
  test("la zona privada pide iniciar sesión", async ({ page }) => {
    await page.goto("/app/ajustes");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fajustes/);
    await expect(page.getByRole("heading", { name: "Entra en Mesa5" })).toBeVisible();
  });

  test("las reseñas también piden iniciar sesión", async ({ page }) => {
    await page.goto("/app/resenas/nueva");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fresenas%2Fnueva/);
  });

  test("la página del plan pide iniciar sesión", async ({ page }) => {
    await page.goto("/app/plan");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fplan/);
  });

  test("el kit de reseñas pide iniciar sesión", async ({ page }) => {
    await page.goto("/app/kit");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fkit/);
  });

  test("la página pública de un restaurante que no existe muestra el 404", async ({ page }) => {
    await page.goto("/r/no-existe");
    await expect(page.getByRole("heading", { name: "Esta mesa no está reservada" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });

  test("el webhook de Stripe no acepta nada si no está configurado", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", { data: "{}" });
    expect(res.status()).toBe(503);
  });

  test("el login muestra Google, email y el error de enlace caducado", async ({ page }) => {
    await page.goto("/login?error=enlace");
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "ha caducado" })).toBeVisible();
  });

  test("el registro pide aceptar los términos", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.getByRole("heading", { name: "Empieza tu prueba gratis" })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveAttribute("required", "");
    await expect(page.getByRole("link", { name: "términos de servicio" })).toHaveAttribute("href", "/legal/terminos");
  });

  test("los botones de prueba gratis llevan al registro", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Prueba gratis 14 días" }).first().click();
    await expect(page).toHaveURL(/\/registro/);
  });
});
