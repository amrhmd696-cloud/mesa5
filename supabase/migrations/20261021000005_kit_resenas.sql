-- ════════════════════════════════════════════════════════════════════
--  Mesa5 · Migración 5: kit de reseñas (fase 1D)
--
--  La página pública mesa5.app/r/<slug> la abre cualquiera (sin sesión).
--  No se abre la tabla restaurants al público: una función devuelve solo
--  los datos públicos de un restaurante. Los comentarios privados se
--  guardan con otra función que limita cuántos se pueden enviar.
-- ════════════════════════════════════════════════════════════════════

-- Solo nombre, ciudad, logo y enlace de Google (nada del tono, la firma, etc.).
create function public.public_restaurant(p_slug text)
returns table (id uuid, name text, slug text, city text, logo_url text, google_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.name, r.slug, r.city, r.logo_url, r.google_url
  from public.restaurants r
  where r.slug = lower(p_slug);
$$;

-- ── Comentarios privados de los clientes ─────────────────────────────
create table public.private_feedback (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  contact text check (char_length(contact) <= 200),
  -- El cliente acepta que el restaurante le escriba (solo si deja contacto)
  consent boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index private_feedback_restaurant_idx on public.private_feedback (restaurant_id, created_at desc);

alter table public.private_feedback enable row level security;

create policy "comentarios: leer si soy miembro" on public.private_feedback
  for select to authenticated using (public.is_org_member(public.restaurant_org(restaurant_id)));
create policy "comentarios: marcar como leído si soy miembro" on public.private_feedback
  for update to authenticated
  using (public.is_org_member(public.restaurant_org(restaurant_id)))
  with check (public.is_org_member(public.restaurant_org(restaurant_id)));

revoke all on public.private_feedback from anon, authenticated;
grant select on public.private_feedback to authenticated;
grant update (read_at) on public.private_feedback to authenticated;

-- Envía un comentario privado. Límites contra el spam:
-- 5 por hora desde la misma conexión (p_client_key, un hash que calcula el
-- servidor) y 30 por hora por restaurante. Devuelve 'ok', 'not_found' o 'rate_limited'.
create function public.submit_private_feedback(
  p_slug text,
  p_message text,
  p_contact text,
  p_consent boolean,
  p_client_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant uuid;
  v_window timestamptz := date_trunc('hour', now());
  v_client int;
  v_total int;
  v_message text := btrim(coalesce(p_message, ''));
  v_contact text := nullif(btrim(coalesce(p_contact, '')), '');
begin
  if char_length(v_message) not between 1 and 2000
     or char_length(coalesce(v_contact, '')) > 200
     or char_length(coalesce(p_client_key, '')) not between 8 and 128 then
    raise exception 'invalid_feedback' using errcode = '22023';
  end if;

  select id into v_restaurant from public.restaurants where slug = lower(p_slug);
  if v_restaurant is null then
    return 'not_found';
  end if;

  insert into public.rate_limits (key, window_start, count)
  values ('feedback-client:' || p_client_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_client;

  insert into public.rate_limits (key, window_start, count)
  values ('feedback-restaurant:' || v_restaurant::text, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_total;

  if v_client > 5 or v_total > 30 then
    return 'rate_limited';
  end if;

  insert into public.private_feedback (restaurant_id, message, contact, consent)
  values (v_restaurant, v_message, v_contact, coalesce(p_consent, false) and v_contact is not null);
  return 'ok';
end;
$$;

revoke execute on function public.public_restaurant(text) from public;
grant execute on function public.public_restaurant(text) to anon, authenticated;
revoke execute on function public.submit_private_feedback(text, text, text, boolean, text) from public;
grant execute on function public.submit_private_feedback(text, text, text, boolean, text) to anon, authenticated;
