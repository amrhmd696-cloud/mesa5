-- Imitación mínima de lo que Supabase ya trae (roles, esquema auth y auth.uid()),
-- para poder probar las migraciones y la seguridad en un Postgres normal.
-- NO se ejecuta en Supabase: allí todo esto ya existe.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Supabase concede por defecto todos los permisos a estos roles en public
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
