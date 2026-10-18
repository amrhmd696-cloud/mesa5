-- ════════════════════════════════════════════════════════════════════
--  Mesa5 · Migración 1: cuentas, organizaciones y restaurantes (fase 1B)
--
--  Modelo:
--    organización (quien paga)  ─┬─ miembros (usuarios)
--                                └─ restaurantes (locales)
--
--  Seguridad: TODAS las tablas tienen Row Level Security. Un usuario solo
--  puede ver las filas de las organizaciones a las que pertenece.
--  Lo que no debe tocar el usuario (plan, estado de la suscripción, ids de
--  Stripe, is_admin) no tiene permiso de escritura desde el navegador: solo
--  lo cambia el servidor con la clave secreta (webhook de Stripe, admin).
-- ════════════════════════════════════════════════════════════════════

-- ── Tipos ────────────────────────────────────────────────────────────
create type public.plan_id as enum ('trial', 'basic', 'pro', 'multi');
create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'expired'
);
create type public.member_role as enum ('owner', 'staff');
create type public.reply_tone as enum ('cercano', 'formal', 'divertido');

-- Actualiza updated_at automáticamente
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Perfiles (uno por usuario de Supabase Auth) ──────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  locale text not null default 'es',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil al registrarse (email o Google)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 120)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Organizaciones (unidad de facturación) ───────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  plan public.plan_id not null default 'trial',
  subscription_status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  is_founder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);

-- ── Restaurantes (locales) ───────────────────────────────────────────
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- Se usa en la página pública mesa5.app/r/<slug>
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  cuisine text check (char_length(cuisine) <= 60),
  city text check (char_length(city) <= 80),
  -- Enlace a la ficha o al formulario de reseña de Google
  google_url text check (char_length(google_url) <= 500),
  tone public.reply_tone not null default 'cercano',
  signature text check (char_length(signature) <= 120),
  star_dishes text[] not null default '{}' check (cardinality(star_dishes) <= 8),
  -- Datos útiles: { "horario": "...", "reservas": "...", "whatsapp": "..." }
  useful_info jsonb not null default '{}'::jsonb check (jsonb_typeof(useful_info) = 'object'),
  logo_url text,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_org_idx on public.restaurants (org_id);

create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

-- ── Funciones auxiliares para las políticas ──────────────────────────
-- security definer evita la recursión de RLS al consultar organization_members.
create function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org_id and m.user_id = (select auth.uid())
  );
$$;

create function public.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org_id and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- ── Onboarding: crea organización + dueño + primer restaurante ───────
-- Se hace en una sola función para que sea atómico y para que el usuario
-- no necesite permiso de INSERT directo sobre organizaciones.
create function public.create_restaurant_with_org(
  p_name text,
  p_slug text,
  p_cuisine text,
  p_city text,
  p_google_url text,
  p_tone public.reply_tone,
  p_signature text,
  p_star_dishes text[],
  p_useful_info jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_restaurant uuid;
  v_slug text := p_slug;
  v_n int := 1;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Por ahora, una organización por dueño (los locales extra del plan
  -- Multi-local se añadirán dentro de la misma organización).
  if exists (select 1 from public.organization_members where user_id = v_user and role = 'owner') then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  -- Si el slug ya existe, añade -2, -3...
  while exists (select 1 from public.restaurants where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := left(p_slug, 75) || '-' || v_n;
  end loop;

  insert into public.organizations (name) values (p_name) returning id into v_org;
  insert into public.organization_members (org_id, user_id, role) values (v_org, v_user, 'owner');
  insert into public.restaurants (
    org_id, name, slug, cuisine, city, google_url, tone, signature, star_dishes, useful_info
  ) values (
    v_org, p_name, v_slug, p_cuisine, p_city, p_google_url, p_tone, p_signature,
    coalesce(p_star_dishes, '{}'), coalesce(p_useful_info, '{}'::jsonb)
  ) returning id into v_restaurant;

  return v_restaurant;
end;
$$;

-- ── Row Level Security ───────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.restaurants enable row level security;

-- Perfiles: cada uno el suyo
create policy "perfil propio: leer" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil propio: editar" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Organizaciones: los miembros leen; el dueño puede cambiar el nombre
create policy "organización: leer si soy miembro" on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy "organización: el dueño edita" on public.organizations
  for update to authenticated using (public.is_org_owner(id)) with check (public.is_org_owner(id));

-- Miembros: se ven los de mis organizaciones
create policy "miembros: leer si soy miembro" on public.organization_members
  for select to authenticated using (public.is_org_member(org_id));

-- Restaurantes: los miembros leen y editan; el dueño puede borrar
create policy "restaurante: leer si soy miembro" on public.restaurants
  for select to authenticated using (public.is_org_member(org_id));
create policy "restaurante: editar si soy miembro" on public.restaurants
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "restaurante: el dueño borra" on public.restaurants
  for delete to authenticated using (public.is_org_owner(org_id));

-- ── Permisos por columna ─────────────────────────────────────────────
-- Supabase da por defecto todos los permisos a anon/authenticated y deja
-- que RLS filtre. Aquí los recortamos para que el navegador no pueda
-- cambiar columnas sensibles aunque una política lo permitiera.
revoke all on public.profiles, public.organizations, public.organization_members, public.restaurants from anon, authenticated;

grant select on public.profiles, public.organizations, public.organization_members, public.restaurants to authenticated;
grant update (full_name, locale) on public.profiles to authenticated;
grant update (name) on public.organizations to authenticated;
grant update (name, cuisine, city, google_url, tone, signature, star_dishes, useful_info, logo_url, locale)
  on public.restaurants to authenticated;
grant delete on public.restaurants to authenticated;

revoke execute on function public.create_restaurant_with_org(text, text, text, text, text, public.reply_tone, text, text[], jsonb) from public, anon;
grant execute on function public.create_restaurant_with_org(text, text, text, text, text, public.reply_tone, text, text[], jsonb) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
