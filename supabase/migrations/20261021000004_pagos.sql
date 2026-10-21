-- ════════════════════════════════════════════════════════════════════
--  Mesa5 · Migración 4: pagos con Stripe (fase 1F)
--
--  El plan y el estado de la suscripción de cada organización solo los
--  cambia el servidor (webhook de Stripe) con la clave secreta de Supabase.
--  El navegador sigue sin poder escribirlos (ver migración 1).
-- ════════════════════════════════════════════════════════════════════

-- Eventos de Stripe ya procesados: si Stripe reenvía uno, no se repite.
create table public.stripe_events (
  id text primary key check (id like 'evt_%'),
  type text not null check (char_length(type) <= 100),
  processed_at timestamptz not null default now()
);

-- Solo el servidor (service_role, que se salta RLS) la usa.
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

-- Un pago fallido deja la suscripción en 'past_due' mientras Stripe reintenta
-- el cobro (unos días). En ese tiempo se deja seguir usando la IA y se avisa
-- en el panel; se bloquea cuando pasa a 'unpaid' o 'canceled'.
create or replace function public.reply_quota_status(p_org_id uuid)
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
  elsif v_org.subscription_status not in ('active', 'trialing', 'past_due') then
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
