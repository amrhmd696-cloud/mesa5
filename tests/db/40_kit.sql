-- Pruebas del kit de reseñas (fase 1D): página pública y comentarios privados.

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
  ('00000000-0000-0000-0000-0000000000f1', 'fran@test.es', '{"full_name":"Fran"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'gema@test.es', '{"full_name":"Gema"}');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.create_restaurant_with_org('Taberna Fran', 'taberna-fran', null, 'Sevilla', 'https://g.page/r/abc/review',
  'cercano', 'Fran', null, null);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select public.create_restaurant_with_org('Bodega Gema', 'bodega-gema', null, null, null, 'formal', null, null, null);
reset role;

-- ── Página pública: solo los datos públicos, también sin sesión ──
select pg_temp.as_anon();
select pg_temp.assert((select name from public.public_restaurant('taberna-fran')) = 'Taberna Fran', 'anónimo ve el nombre');
select pg_temp.assert((select google_url from public.public_restaurant('TABERNA-FRAN')) = 'https://g.page/r/abc/review', 'el slug no distingue mayúsculas');
select pg_temp.assert((select count(*) from public.public_restaurant('no-existe')) = 0, 'slug que no existe');
do $$ begin
  perform 1 from public.restaurants;
  raise exception 'FALLO: anónimo lee la tabla restaurants';
exception when insufficient_privilege then null; end $$;

-- ── Comentarios privados ──
select pg_temp.assert(public.submit_private_feedback('taberna-fran', '  La croqueta estaba fría  ', 'fran@cliente.es', true, 'cliente-aaaa') = 'ok', 'anónimo envía un comentario');
select pg_temp.assert(public.submit_private_feedback('no-existe', 'Hola', null, false, 'cliente-aaaa') = 'not_found', 'restaurante que no existe');
do $$ begin
  perform public.submit_private_feedback('taberna-fran', '   ', null, false, 'cliente-aaaa');
  raise exception 'FALLO: acepta un comentario vacío';
exception when invalid_parameter_value then null; end $$;
do $$ begin
  perform public.submit_private_feedback('taberna-fran', repeat('a', 2001), null, false, 'cliente-aaaa');
  raise exception 'FALLO: acepta un comentario demasiado largo';
exception when invalid_parameter_value then null; end $$;
do $$ begin
  perform 1 from public.private_feedback;
  raise exception 'FALLO: anónimo lee los comentarios';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.private_feedback (restaurant_id, message) values ((select id from public.public_restaurant('taberna-fran')), 'directo');
  raise exception 'FALLO: anónimo inserta sin pasar por la función';
exception when insufficient_privilege then null; end $$;
-- Sin contacto, el consentimiento no cuenta
select public.submit_private_feedback('taberna-fran', 'Sin contacto', null, true, 'cliente-bbbb');
reset role;
select pg_temp.assert((select consent from public.private_feedback where message = 'Sin contacto') = false, 'sin contacto no hay consentimiento');
select pg_temp.assert((select message from public.private_feedback where contact = 'fran@cliente.es') = 'La croqueta estaba fría', 'se recorta el texto');

-- Límite: 5 por hora desde la misma conexión (ya lleva 1 válido)
select pg_temp.as_anon();
select public.submit_private_feedback('taberna-fran', 'spam ' || i, null, false, 'cliente-spam') from generate_series(1, 5) i;
select pg_temp.assert(public.submit_private_feedback('taberna-fran', 'spam 6', null, false, 'cliente-spam') = 'rate_limited', 'límite por conexión');
reset role;
select pg_temp.assert((select count(*) from public.private_feedback where message like 'spam%') = 5, 'el sexto no se guarda');

-- ── Cada dueño ve solo los suyos y puede marcarlos como leídos ──
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.assert((select count(*) from public.private_feedback) = 7, 'Fran ve sus comentarios');
update public.private_feedback set read_at = now() where message = 'Sin contacto';
select pg_temp.assert((select read_at is not null from public.private_feedback where message = 'Sin contacto'), 'marca como leído');
do $$ begin
  update public.private_feedback set message = 'cambiado';
  raise exception 'FALLO: el dueño cambia el texto del cliente';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select pg_temp.assert((select count(*) from public.private_feedback) = 0, 'Gema no ve los de Fran');
reset role;
