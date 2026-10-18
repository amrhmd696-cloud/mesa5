# Mesa5

**Más reseñas, mejores respuestas, más clientes.**

Mesa5 es un SaaS para restaurantes pequeños e independientes de habla hispana: ayuda a conseguir más reseñas en Google, responderlas con IA en el tono del restaurante y entender qué opinan los clientes.

> Estado: **Fase 1A** (web pública: landing, blog, páginas legales y SEO). El plan completo está en la propuesta aprobada del proyecto.

## Tecnología

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) + TypeScript
- Tailwind CSS 4
- `next-intl` para los textos (todo en `messages/es.json`, listo para más idiomas)
- MDX para el blog y las páginas legales
- Vitest (tests unitarios) y Playwright (tests en móvil y escritorio)
- Próximamente: Supabase, Stripe, API de Anthropic, Resend

## Estructura

```
app/(marketing)/     Landing, blog, legal, registro (provisional)
app/sitemap.ts       Sitemap automático
app/robots.ts        robots.txt
app/opengraph-image  Imagen para compartir en redes
components/          Logo, botones, cabecera, pie, aviso de cookies
content/blog/        Artículos del blog (.mdx)
lib/                 Configuración del sitio, planes y precios, blog
messages/es.json     Todos los textos de la interfaz
proxy.ts             Se ejecuta antes de cada página (404 del blog; sesión en 1B)
tests/               Tests unitarios y de extremo a extremo
```

## Instalar y ejecutar en tu ordenador

Necesitas [Node.js](https://nodejs.org) 20.9 o superior (descarga la versión "LTS").

```bash
git clone https://github.com/amrhmd696-cloud/mesa5.git
cd mesa5
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
npm run dev
```

Abre <http://localhost:3000> en el navegador.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca la web en modo desarrollo |
| `npm run build` | Compila la versión de producción |
| `npm run start` | Sirve la versión compilada |
| `npm run lint` | Revisa el estilo del código |
| `npm test` | Tests unitarios |
| `npm run test:e2e` | Tests en navegador (móvil y escritorio). Ejecuta antes `npm run build` y, la primera vez, `npx playwright install chromium` |

## Cómo añadir un artículo al blog

1. Crea `content/blog/mi-articulo.mdx` y escribe el texto en Markdown.
2. Añade su ficha en `lib/blog.ts` (slug, título, descripción de máximo 160 caracteres, fecha).
3. Listo: aparece en `/blog` y en el sitemap.

## Cómo cambiar textos o precios

- Textos: `messages/es.json`.
- Precios mostrados: variables `NEXT_PUBLIC_PRICE_*_EUR` (en `.env.local` y en Vercel).

## Desplegar en Vercel (paso a paso)

1. Entra en [vercel.com/signup](https://vercel.com/signup) y regístrate con **"Continue with GitHub"**.
2. Pulsa **Add New… → Project** y elige el repositorio `mesa5` (si no aparece, pulsa "Adjust GitHub App Permissions" y dale acceso).
3. Vercel detecta Next.js solo. Abre **Environment Variables** y añade las de `.env.example`, poniendo en `NEXT_PUBLIC_SITE_URL` la dirección que te dará Vercel (por ejemplo `https://mesa5.vercel.app`).
4. Pulsa **Deploy**. En un par de minutos tendrás la web online.
5. Cada vez que se suba código nuevo a GitHub, Vercel publica la nueva versión automáticamente.

> El plan gratuito de Vercel (Hobby) sirve para desarrollar. Cuando empieces a cobrar a clientes tendrás que pasar al plan Pro, porque Hobby no permite uso comercial.

## Configurar Supabase y Stripe

Se documentará aquí en las fases 1B (Supabase) y 1F (Stripe).

## Páginas legales

Las páginas de `/legal` son **plantillas**: hay que completar los datos entre corchetes (`[NOMBRE]`, `[NIF]`…) y revisarlas antes de lanzar con clientes reales.
