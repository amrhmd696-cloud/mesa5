-- ════════════════════════════════════════════════════════════════════
--  Mesa5 · Migración 3: reseñas, respuestas con IA y uso (fase 1C)
--
--  reviews ──┬── review_topics (comida, servicio…, positivo/negativo)
--            └── replies (versiones 1, 2, 3…; una puede estar elegida)
--
--  Cuota: usage_monthly cuenta las reseñas respondidas con IA cada mes.
--  El límite de cada plan se comprueba aquí, en la base de datos, de forma
--  atómica (dos peticiones a la vez no pueden pasarse del límite).
--
--  Todas las escrituras pasan por funciones (RPC) que comprueban que el
--  usuario pertenece a la organización del restaurante. En la fase 1F,
--  cuando el servidor tenga la clave secreta, ai_usage se escribirá solo
--  desde el servidor.
-- ════════════════════════════════════════════════════════════════════

create type public.review_status as enum ('pending', 'answered');
create type public.review_sentiment as enum ('positivo', 'neutro', 'negativo');
create type public.review_topic as enum ('comida', 'servicio', 'espera', 'precio', 'limpieza', 'ambiente');
create type public.topic_polarity as enum ('positivo', 'negativo');
create type public.reply_adjustment as enum ('regenerate', 'shorter', 'warmer', 'formal');

-- ── Reseñas ──────────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'google')),
  author_name text check (char_length(author_name) <= 120),
  rating smallint not null check (rating between 1 and 5),
  text text not null check (char_length(text) between 1 and 5000),
  language text check (char_length(language) <= 10),
  review_date date,
  status public.review_status not null default 'pending',
  sentiment public.review_sentiment,
  google_review_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_restaurant_created_idx on public.reviews (restaurant_id, created_at desc);

create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.review_topics (
  review_id uuid not null references public.reviews (id) on delete cascade,
  topic public.review_topic not null,
  polarity public.topic_polarity not null,
  primary key (review_id, topic)
);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  version int not null check (version >= 1),
  text text not null check (char_length(text) between 1 and 2000),
  adjustment public.reply_adjustment,
  is_selected boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (review_id, version)
);

-- ── Uso y costes ─────────────────────────────────────────────────────
create table public.usage_monthly (
  org_id uuid not null references public.organizations (id) on delete cascade,
  month date not null,
  replies_count int not null default 0 check (replies_count >= 0),
  primary key (org_id, month)
);

-- Cada llamada a la IA: modelo, tokens y coste estimado. Solo lo ve el admin.
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete set null,
  lead_id uuid,
  feature text not null check (feature in ('reply', 'adjust', 'free_tool', 'report')),
  model text not null check (char_length(model) <= 80),
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cost_eur numeric(12, 6) not null default 0 check (cost_eur >= 0),
  created_at timestamptz not null default now()
);

create index ai_usage_org_created_idx on public.ai_usage (org_id, created_at desc);

-- Límite de peticiones por ventana de tiempo (p. ej. 20 por minuto).
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

-- ── Funciones auxiliares ─────────────────────────────────────────────
-- Organización del restaurante (security definer para usarla en políticas).
create function public.restaurant_org(p_restaurant_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.restaurants where id = p_restaurant_id;
$$;

create function public.review_org(p_review_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.org_id from public.reviews v join public.restaurants r on r.id = v.restaurant_id where v.id = p_review_id;
$$;

-- Mes actual en horario de España (el contador se reinicia el día 1).
create function public.current_usage_month()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'Europe/Madrid')::date;
$$;

-- Respuestas al mes de cada plan. null = ilimitadas.
-- ¡Debe coincidir con monthlyReplies en lib/billing/plans.ts! (lo comprueba un test)
create function public.plan_reply_limit(p_plan public.plan_id)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'basic' then 60
    else null
  end;
$$;

-- ¿Puede la organización generar respuestas ahora? Devuelve 'ok' o el motivo.
create function public.reply_quota_status(p_org_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
  v_limit int;
  v_used int;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_org from public.organizations where id = p_org_id;

  if v_org.plan = 'trial' then
    if v_org.trial_ends_at <= now() then
      return 'trial_expired';
    end if;
  elsif v_org.subscription_status not in ('active', 'trialing') then
    return 'inactive';
  end if;

  v_limit := public.plan_reply_limit(v_org.plan);
  if v_limit is null then
    return 'ok';
  end if;
  select coalesce(replies_count, 0) into v_used
  from public.usage_monthly where org_id = p_org_id and month = public.current_usage_month();
  if coalesce(v_used, 0) >= v_limit then
    return 'limit_reached';
  end if;
  return 'ok';
end;
$$;

-- Rate limit por usuario: true si aún puede hacer otra petición.
create function public.check_user_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz;
  v_count int;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_max < 1 or p_window_seconds < 1 or char_length(p_bucket) > 40 then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (key, window_start, count)
  values (p_bucket || ':' || v_user::text, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Limpieza de ventanas viejas (barata: solo las de este usuario y cubo)
  delete from public.rate_limits
  where key = p_bucket || ':' || v_user::text and window_start < v_window - interval '1 day';

  return v_count <= p_max;
end;
$$;

-- Registra una llamada a la IA de la organización del usuario.
create function public.log_ai_usage(
  p_org_id uuid,
  p_feature text,
  p_model text,
  p_input_tokens int,
  p_output_tokens int,
  p_cost_eur numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.ai_usage (org_id, feature, model, input_tokens, output_tokens, cost_eur)
  values (p_org_id, p_feature, p_model, greatest(p_input_tokens, 0), greatest(p_output_tokens, 0), greatest(p_cost_eur, 0));
end;
$$;

-- Guarda una reseña nueva con sus temas y respuestas, y gasta 1 de la cuota.
-- Todo en una transacción: si no queda cuota, no se guarda nada.
create function public.save_review_with_replies(
  p_restaurant_id uuid,
  p_author_name text,
  p_rating int,
  p_text text,
  p_language text,
  p_sentiment public.review_sentiment,
  p_topics jsonb,
  p_replies text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.restaurant_org(p_restaurant_id);
  v_status text;
  v_limit int;
  v_month date := public.current_usage_month();
  v_count int;
  v_review uuid;
  v_topic jsonb;
  v_i int;
begin
  if v_org is null or not public.is_org_member(v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(array_length(p_replies, 1), 0) not between 1 and 3 then
    raise exception 'invalid_replies' using errcode = '22023';
  end if;

  v_status := public.reply_quota_status(v_org);
  if v_status <> 'ok' then
    raise exception '%', v_status using errcode = 'P0001';
  end if;

  -- Gasta la cuota de forma atómica (bloquea la fila del mes)
  insert into public.usage_monthly (org_id, month, replies_count) values (v_org, v_month, 1)
  on conflict (org_id, month) do update set replies_count = public.usage_monthly.replies_count + 1
  returning replies_count into v_count;
  select public.plan_reply_limit(plan) into v_limit from public.organizations where id = v_org;
  if v_limit is not null and v_count > v_limit then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;

  insert into public.reviews (restaurant_id, author_name, rating, text, language, sentiment)
  values (p_restaurant_id, nullif(trim(p_author_name), ''), p_rating, p_text, p_language, p_sentiment)
  returning id into v_review;

  for v_topic in select * from jsonb_array_elements(coalesce(p_topics, '[]'::jsonb)) loop
    insert into public.review_topics (review_id, topic, polarity)
    values (v_review, (v_topic ->> 'topic')::public.review_topic, (v_topic ->> 'polarity')::public.topic_polarity)
    on conflict (review_id, topic) do nothing;
  end loop;

  for v_i in 1 .. array_length(p_replies, 1) loop
    insert into public.replies (review_id, version, text) values (v_review, v_i, p_replies[v_i]);
  end loop;

  return v_review;
end;
$$;

-- Añade una versión ajustada ("más corta", "más cálida"…). No gasta cuota.
create function public.add_reply_version(
  p_review_id uuid,
  p_text text,
  p_adjustment public.reply_adjustment
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.review_org(p_review_id);
  v_version int;
  v_reply uuid;
begin
  if v_org is null or not public.is_org_member(v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Bloquea la reseña para que dos ajustes a la vez no choquen en el número de versión
  perform 1 from public.reviews where id = p_review_id for update;
  select coalesce(max(version), 0) + 1 into v_version from public.replies where review_id = p_review_id;
  if v_version > 20 then
    raise exception 'too_many_versions' using errcode = 'P0001';
  end if;
  insert into public.replies (review_id, version, text, adjustment)
  values (p_review_id, v_version, p_text, p_adjustment)
  returning id into v_reply;
  return v_reply;
end;
$$;

-- Marca una respuesta como la elegida y la reseña como respondida.
create function public.select_reply(p_reply_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review uuid;
begin
  select review_id into v_review from public.replies where id = p_reply_id;
  if v_review is null or not public.is_org_member(public.review_org(v_review)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.replies set is_selected = (id = p_reply_id),
    published_at = case when id = p_reply_id then coalesce(published_at, now()) else published_at end
  where review_id = v_review;
  update public.reviews set status = 'answered' where id = v_review;
end;
$$;

-- ── Row Level Security ───────────────────────────────────────────────
alter table public.reviews enable row level security;
alter table public.review_topics enable row level security;
alter table public.replies enable row level security;
alter table public.usage_monthly enable row level security;
alter table public.ai_usage enable row level security;
alter table public.rate_limits enable row level security;

create policy "reseñas: leer si soy miembro" on public.reviews
  for select to authenticated using (public.is_org_member(public.restaurant_org(restaurant_id)));
create policy "reseñas: borrar si soy miembro" on public.reviews
  for delete to authenticated using (public.is_org_member(public.restaurant_org(restaurant_id)));

create policy "temas: leer si soy miembro" on public.review_topics
  for select to authenticated using (public.is_org_member(public.review_org(review_id)));

create policy "respuestas: leer si soy miembro" on public.replies
  for select to authenticated using (public.is_org_member(public.review_org(review_id)));

create policy "uso: leer si soy miembro" on public.usage_monthly
  for select to authenticated using (public.is_org_member(org_id));

-- ai_usage y rate_limits: sin políticas → nadie las lee desde el navegador.

-- ── Permisos ─────────────────────────────────────────────────────────
revoke all on public.reviews, public.review_topics, public.replies, public.usage_monthly,
  public.ai_usage, public.rate_limits from anon, authenticated;

grant select on public.reviews, public.review_topics, public.replies, public.usage_monthly to authenticated;
grant delete on public.reviews to authenticated;

revoke execute on function public.restaurant_org(uuid) from public, anon;
revoke execute on function public.review_org(uuid) from public, anon;
revoke execute on function public.reply_quota_status(uuid) from public, anon;
revoke execute on function public.check_user_rate_limit(text, int, int) from public, anon;
revoke execute on function public.log_ai_usage(uuid, text, text, int, int, numeric) from public, anon;
revoke execute on function public.save_review_with_replies(uuid, text, int, text, text, public.review_sentiment, jsonb, text[]) from public, anon;
revoke execute on function public.add_reply_version(uuid, text, public.reply_adjustment) from public, anon;
revoke execute on function public.select_reply(uuid) from public, anon;

grant execute on function public.restaurant_org(uuid) to authenticated;
grant execute on function public.review_org(uuid) to authenticated;
grant execute on function public.reply_quota_status(uuid) to authenticated;
grant execute on function public.check_user_rate_limit(text, int, int) to authenticated;
grant execute on function public.log_ai_usage(uuid, text, text, int, int, numeric) to authenticated;
grant execute on function public.save_review_with_replies(uuid, text, int, text, text, public.review_sentiment, jsonb, text[]) to authenticated;
grant execute on function public.add_reply_version(uuid, text, public.reply_adjustment) to authenticated;
grant execute on function public.select_reply(uuid) to authenticated;
