# Mesa5

**Más reseñas, mejores respuestas, más clientes.**

Mesa5 es un SaaS para restaurantes pequeños e independientes de habla hispana: ayuda a conseguir más reseñas en Google, responderlas con IA en el tono del restaurante y entender qué opinan los clientes.

> Estado: **Fase 1B** (web pública, registro con email y Google, onboarding y ajustes del restaurante). El plan completo está en la propuesta aprobada del proyecto.

## Tecnología

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) + TypeScript
- Tailwind CSS 4
- `next-intl` para los textos (todo en `messages/es.json`, listo para más idiomas)
- MDX para el blog y las páginas legales
- Vitest (tests unitarios) y Playwright (tests en móvil y escritorio)
- Supabase (autenticación y Postgres con Row Level Security)
- Próximamente: Stripe, API de Anthropic, Resend

## Estructura

```
app/(marketing)/     Landing, blog, legal
app/(auth)/          Entrar, registro, recuperar contraseña
app/app/             Zona privada: panel, onboarding, ajustes
app/auth/            Vuelta desde Google y enlaces de email
app/sitemap.ts       Sitemap automático
app/robots.ts        robots.txt
app/opengraph-image  Imagen para compartir en redes
components/          Logo, botones, cabecera, pie, aviso de cookies
content/blog/        Artículos del blog (.mdx)
lib/                 Configuración del sitio, planes y precios, blog
messages/es.json     Todos los textos de la interfaz
proxy.ts             Se ejecuta antes de cada página: sesión, zona privada y 404 del blog
supabase/migrations/ Tablas, permisos y seguridad (RLS) de la base de datos
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
| `npm run test:db` | Prueba las migraciones y la seguridad de la base de datos |
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

## Configurar Supabase (paso a paso)

Supabase guarda los usuarios, los restaurantes y todos los datos. Necesitas hacerlo una sola vez.

### 1. Crear las tablas

1. En [supabase.com](https://supabase.com), abre tu proyecto y entra en **SQL Editor** (menú de la izquierda).
2. Pulsa **New query**.
3. Abre el archivo `supabase/migrations/20261018000001_cuentas.sql` de este repositorio, copia **todo** su contenido y pégalo.
4. Pulsa **Run**. Debe salir "Success. No rows returned".

Cuando haya migraciones nuevas (cada fase añade una), se repite con el archivo nuevo, siempre en orden.

### 2. Copiar las claves públicas

En el botón **Connect** (arriba) o en **Project Settings → API Keys** copia:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Ponlas en `.env.local` (en tu ordenador) y en Vercel (**Settings → Environment Variables**), y vuelve a publicar.

### 3. Direcciones permitidas

En **Authentication → URL Configuration**:

- **Site URL**: la dirección de tu web en Vercel, por ejemplo `https://mesa5.vercel.app`.
- **Redirect URLs**: añade `https://mesa5.vercel.app/**` y `http://localhost:3000/**`.

### 4. Emails de confirmación (recomendado)

Para que el enlace de confirmación funcione aunque el cliente abra el email en otro móvil, en **Authentication → Emails** cambia el enlace de estas plantillas:

- **Confirm signup**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app/onboarding`
- **Reset password**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nueva-contrasena`

> Importante: el servicio de email que trae Supabase gratis solo envía unos pocos emails por hora y solo a los miembros de tu equipo. Para clientes reales configuraremos Resend en la fase 2A. Mientras pruebas, puedes desactivar **Confirm email** en **Authentication → Sign In / Providers → Email**.

### 5. Entrar con Google

1. Entra en [console.cloud.google.com](https://console.cloud.google.com), crea un proyecto llamado `Mesa5`.
2. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth**, elige **Externo** y rellena el nombre (Mesa5), tu email y el logo.
3. Ve a **Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo **Aplicación web**.
4. En **URIs de redireccionamiento autorizados** pega la que te muestra Supabase en **Authentication → Sign In / Providers → Google** (termina en `/auth/v1/callback`).
5. Copia el **ID de cliente** y el **Secreto** en esa misma pantalla de Supabase, activa Google y guarda.

### Probar la base de datos en local

`npm run test:db` crea un Postgres temporal, aplica las migraciones y comprueba que un restaurante nunca puede ver ni modificar los datos de otro. Necesita Postgres 15 o superior instalado y no puede ejecutarse como root.

## Configurar Stripe

Se documentará aquí en la fase 1F.

## Páginas legales

Las páginas de `/legal` son **plantillas**: hay que completar los datos entre corchetes (`[NOMBRE]`, `[NIF]`…) y revisarlas antes de lanzar con clientes reales.
