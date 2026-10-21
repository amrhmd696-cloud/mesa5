-- Pruebas de la migración de reseñas y respuestas (fase 1C).
-- Carla (Pro en prueba) y Dani (plan Básico) tienen cada uno su restaurante.

create function pg_temp.as_user(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_id::text, false);
  execute 'set role authenticated';
end $$;

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  execute 'set role anon';
end $$;

create function pg_temp.assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FALLO: %', p_msg; end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'carla@test.es', '{"full_name":"Carla"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'dani@test.es', '{"full_name":"Dani"}');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select public.create_restaurant_with_org('Casa Carla', 'casa-carla', null, null, null, 'cercano', null, null, null);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.create_restaurant_with_org('Bar Dani', 'bar-dani', null, null, null, 'formal', null, null, null);
reset role;

-- ── Carla guarda una reseña con temas y dos respuestas ──
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(public.reply_quota_status((select id from public.organizations)) = 'ok', 'la prueba permite generar');
select public.save_review_with_replies(
  (select id from public.restaurants), 'Lucía', 4, 'La paella buenísima, pero tardaron con la cuenta.', 'es', 'positivo',
  '[{"topic":"comida","polarity":"positivo"},{"topic":"espera","polarity":"negativo"}]', array['Respuesta A', 'Respuesta B']);
select pg_temp.assert((select count(*) from public.reviews) = 1, 'Carla ve su reseña');
select pg_temp.assert((select count(*) from public.review_topics) = 2, 'se guardan los temas');
select pg_temp.assert((select count(*) from public.replies) = 2, 'se guardan las dos versiones');
select pg_temp.assert((select replies_count from public.usage_monthly) = 1, 'gasta 1 de la cuota');
select pg_temp.assert((select status::text from public.reviews) = 'pending', 'empieza pendiente');

-- Ajuste: nueva versión 3, sin gastar cuota
select public.add_reply_version((select id from public.reviews), 'Respuesta C más corta', 'shorter');
select pg_temp.assert((select max(version) from public.replies) = 3, 'el ajuste crea la versión 3');
select pg_temp.assert((select replies_count from public.usage_monthly) = 1, 'ajustar no gasta cuota');

-- Elegir una respuesta marca la reseña como respondida
select public.select_reply((select id from public.replies where version = 3));
select pg_temp.assert((select status::text from public.reviews) = 'answered', 'elegir la marca como respondida');
select pg_temp.assert((select count(*) from public.replies where is_selected) = 1, 'solo una elegida');
select public.select_reply((select id from public.replies where version = 1));
select pg_temp.assert((select version from public.replies where is_selected) = 1, 'cambiar de elegida');

-- Carla no puede escribir directamente en las tablas
do $$ begin
  insert into public.reviews (restaurant_id, rating, text) select id, 5, 'x' from public.restaurants;
  raise exception 'FALLO: Carla pudo insertar una reseña sin pasar por la función';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.usage_monthly set replies_count = 0;
  raise exception 'FALLO: Carla pudo reiniciar su cuota';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform 1 from public.ai_usage;
  raise exception 'FALLO: Carla pudo leer ai_usage';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Aislamiento: Dani no ve ni toca lo de Carla ──
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.assert((select count(*) from public.reviews) = 0, 'Dani no ve reseñas ajenas');
select pg_temp.assert((select count(*) from public.replies) = 0, 'Dani no ve respuestas ajenas');
select pg_temp.assert((select count(*) from public.review_topics) = 0, 'Dani no ve temas ajenos');
select pg_temp.assert((select count(*) from public.usage_monthly) = 0, 'Dani no ve el uso ajeno');
do $$ begin
  perform public.save_review_with_replies((select id from public.restaurants where slug = 'casa-carla'),
    null, 1, 'Spam', 'es', 'negativo', '[]', array['x']);
  raise exception 'FALLO: Dani pudo guardar una reseña en el restaurante de Carla';
exception when insufficient_privilege then null; end $$;
reset role;
do $$
declare v_reply uuid; v_review uuid; v_org uuid;
begin
  select id into v_reply from public.replies where version = 2;
  select org_id into v_org from public.restaurants where slug = 'casa-carla';
  select id into v_review from public.reviews limit 1;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false);
  set local role authenticated;
  begin
    perform public.select_reply(v_reply);
    raise exception 'FALLO: Dani pudo elegir una respuesta de Carla';
  exception when insufficient_privilege then null; end;
  begin
    perform public.add_reply_version(v_review, 'Hackeo', null);
    raise exception 'FALLO: Dani pudo añadir una versión a una reseña de Carla';
  exception when insufficient_privilege then null; end;
  begin
    perform public.log_ai_usage(v_org, 'reply', 'x', 1, 1, 0);
    raise exception 'FALLO: log_ai_usage aceptó una organización ajena';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── Límite del plan Básico (60 al mes) ──
update public.organizations set plan = 'basic', subscription_status = 'active'
  where id = (select org_id from public.restaurants where slug = 'bar-dani');
insert into public.usage_monthly (org_id, month, replies_count)
  select org_id, public.current_usage_month(), 59 from public.restaurants where slug = 'bar-dani';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.save_review_with_replies((select id from public.restaurants), null, 5, 'Genial', 'es', 'positivo', '[]', array['Gracias']);
select pg_temp.assert((select replies_count from public.usage_monthly) = 60, 'llega a 60');
select pg_temp.assert(public.reply_quota_status((select id from public.organizations)) = 'limit_reached', 'avisa del límite');
do $$ begin
  perform public.save_review_with_replies((select id from public.restaurants), null, 5, 'Otra', 'es', 'positivo', '[]', array['Gracias']);
  raise exception 'FALLO: se pasó del límite del plan Básico';
exception when raise_exception then
  if sqlerrm <> 'limit_reached' then raise; end if;
end $$;
select pg_temp.assert((select count(*) from public.reviews) = 1, 'la reseña rechazada no se guarda');
select pg_temp.assert((select replies_count from public.usage_monthly) = 60, 'el intento rechazado no suma');
reset role;

-- ── Prueba caducada y suscripción impagada ──
update public.organizations set trial_ends_at = now() - interval '1 day'
  where id = (select org_id from public.restaurants where slug = 'casa-carla');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(public.reply_quota_status((select id from public.organizations)) = 'trial_expired', 'prueba caducada bloquea la IA');
select pg_temp.assert((select count(*) from public.reviews) = 1, 'con la prueba caducada sigue viendo su historial');
reset role;
update public.organizations set subscription_status = 'unpaid'
  where id = (select org_id from public.restaurants where slug = 'bar-dani');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.assert(public.reply_quota_status((select id from public.organizations)) = 'inactive', 'impago bloquea la IA');
reset role;

-- ── Rate limit por usuario ──
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(public.check_user_rate_limit('ia', 2, 3600), 'primera petición pasa');
select pg_temp.assert(public.check_user_rate_limit('ia', 2, 3600), 'segunda petición pasa');
select pg_temp.assert(not public.check_user_rate_limit('ia', 2, 3600), 'la tercera se bloquea');
do $$ begin
  perform 1 from public.rate_limits;
  raise exception 'FALLO: un usuario pudo leer rate_limits';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Anónimos: nada ──
select pg_temp.as_anon();
do $$ begin
  perform 1 from public.reviews;
  raise exception 'FALLO: un anónimo pudo leer reseñas';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.check_user_rate_limit('ia', 1, 60);
  raise exception 'FALLO: un anónimo pudo usar el rate limit';
exception when insufficient_privilege then null; end $$;
reset role;

-- Borrar el restaurante borra sus reseñas y respuestas
delete from public.restaurants where slug = 'casa-carla';
select pg_temp.assert((select count(*) from public.replies r join public.reviews v on v.id = r.review_id
  join public.restaurants x on x.id = v.restaurant_id where x.slug = 'casa-carla') = 0, 'borrado en cascada');
select pg_temp.assert((select count(*) from public.reviews) = 1, 'solo queda la reseña de Dani');
