-- Pruebas de la migración de pagos (fase 1F).

create function pg_temp.as_user(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_id::text, false);
  execute 'set role authenticated';
end $$;

create function pg_temp.assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FALLO: %', p_msg; end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'eva@test.es', '{"full_name":"Eva"}');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select public.create_restaurant_with_org('Casa Eva', 'casa-eva', null, null, null, 'cercano', null, null, null);
reset role;

create temp table eva as
  select id as org_id from public.organizations o
  where exists (select 1 from public.organization_members m
                where m.org_id = o.id and m.user_id = '00000000-0000-0000-0000-0000000000e1');
grant select on eva to authenticated, service_role;

-- ── stripe_events: el navegador no puede ni leer ni escribir ──
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  perform 1 from public.stripe_events;
  raise exception 'FALLO: un usuario lee stripe_events';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.stripe_events (id, type) values ('evt_falso', 'checkout.session.completed');
  raise exception 'FALLO: un usuario inserta en stripe_events';
exception when insufficient_privilege then null; end $$;

-- ── El usuario no puede darse un plan a sí mismo ──
do $$ begin
  update public.organizations set plan = 'pro', subscription_status = 'active' where id = (select org_id from eva);
  raise exception 'FALLO: un usuario cambia su propio plan';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.organizations set stripe_customer_id = 'cus_falso' where id = (select org_id from eva);
  raise exception 'FALLO: un usuario cambia su cliente de Stripe';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── El servidor (service_role) sí escribe ──
set role service_role;
insert into public.stripe_events (id, type) values ('evt_1', 'invoice.paid');
update public.organizations set plan = 'basic', subscription_status = 'active', stripe_customer_id = 'cus_1'
  where id = (select org_id from eva);
do $$ begin
  insert into public.stripe_events (id, type) values ('evt_1', 'invoice.paid');
  raise exception 'FALLO: se guarda dos veces el mismo evento';
exception when unique_violation then null; end $$;
reset role;

-- ── Estados de la suscripción ──
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert(public.reply_quota_status((select org_id from eva)) = 'ok', 'activa: puede generar');
reset role;
update public.organizations set subscription_status = 'past_due' where id = (select org_id from eva);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert(public.reply_quota_status((select org_id from eva)) = 'ok', 'pago pendiente: sigue mientras Stripe reintenta');
reset role;
update public.organizations set subscription_status = 'unpaid' where id = (select org_id from eva);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert(public.reply_quota_status((select org_id from eva)) = 'inactive', 'impagada: se bloquea');
reset role;
update public.organizations set subscription_status = 'canceled' where id = (select org_id from eva);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert(public.reply_quota_status((select org_id from eva)) = 'inactive', 'cancelada: se bloquea');
reset role;
-- Socio fundador: Pro con el mes gratis de Stripe (trialing) puede generar
update public.organizations set plan = 'pro', subscription_status = 'trialing', is_founder = true where id = (select org_id from eva);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert(public.reply_quota_status((select org_id from eva)) = 'ok', 'fundador en su mes gratis: puede generar');
reset role;
