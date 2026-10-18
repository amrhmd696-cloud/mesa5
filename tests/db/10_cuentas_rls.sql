-- Pruebas de seguridad de la migración de cuentas.
-- Dos dueños (Ana y Bruno) crean cada uno su restaurante y comprobamos que
-- ninguno puede ver ni tocar los datos del otro.

-- Helpers: actuar como un usuario concreto o como visitante anónimo
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

-- Usuarios de prueba (el trigger debe crear sus perfiles)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.es', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@test.es', '{"name":"Bruno"}');

select pg_temp.assert((select count(*) from public.profiles) = 2, 'se crean los perfiles al registrarse');
select pg_temp.assert((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'Bruno',
  'toma el nombre de Google (name)');

-- Ana completa el onboarding
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_restaurant_with_org('La Parrilla', 'la-parrilla', 'Asador', 'Sevilla',
  'https://g.page/r/abc/review', 'cercano', 'Ana, del equipo de La Parrilla',
  array['Chuletón', 'Pimientos'], '{"horario":"13-16h"}');
reset role;

-- Bruno elige el mismo nombre: el slug debe cambiar a la-parrilla-2
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_restaurant_with_org('La Parrilla', 'la-parrilla', null, 'Madrid', null, 'formal', null, null, null);
select pg_temp.assert((select slug from public.restaurants) = 'la-parrilla-2', 'slug único con sufijo');
reset role;

-- ── Aislamiento entre restaurantes ──
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.assert((select count(*) from public.restaurants) = 1, 'Ana solo ve su restaurante');
select pg_temp.assert((select count(*) from public.organizations) = 1, 'Ana solo ve su organización');
select pg_temp.assert((select count(*) from public.organization_members) = 1, 'Ana solo ve sus miembros');
select pg_temp.assert((select count(*) from public.profiles) = 1, 'Ana solo ve su perfil');
select pg_temp.assert((select plan::text from public.organizations) = 'trial', 'empieza en prueba');
select pg_temp.assert((select trial_ends_at::date from public.organizations) = (now() + interval '14 days')::date, 'prueba de 14 días');

-- Ana intenta modificar el restaurante de Bruno: no afecta a ninguna fila
update public.restaurants set name = 'Hackeado' where slug = 'la-parrilla-2';
reset role;
select pg_temp.assert((select name from public.restaurants where slug = 'la-parrilla-2') = 'La Parrilla',
  'Ana no puede editar el restaurante de Bruno');

-- Ana intenta borrar el de Bruno
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.restaurants where slug = 'la-parrilla-2';
reset role;
select pg_temp.assert((select count(*) from public.restaurants) = 2, 'Ana no puede borrar el restaurante de Bruno');

-- ── Columnas protegidas ──
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  update public.organizations set plan = 'pro';
  raise exception 'FALLO: el usuario pudo cambiarse el plan';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.organizations set subscription_status = 'active', trial_ends_at = now() + interval '10 years';
  raise exception 'FALLO: el usuario pudo alargar su prueba';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.profiles set is_admin = true;
  raise exception 'FALLO: el usuario pudo hacerse administrador';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.restaurants set org_id = gen_random_uuid();
  raise exception 'FALLO: el usuario pudo mover su restaurante de organización';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.organizations (name) values ('Otra');
  raise exception 'FALLO: el usuario pudo crear organizaciones directamente';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.organization_members (org_id, user_id, role)
  select id, '00000000-0000-0000-0000-00000000000a', 'owner' from public.organizations limit 1;
  raise exception 'FALLO: el usuario pudo añadirse como miembro';
exception when insufficient_privilege then null; end $$;

-- Lo que sí puede hacer: editar su perfil y su restaurante
update public.profiles set full_name = 'Ana María';
update public.restaurants set tone = 'divertido', star_dishes = array['Chuletón'];
select pg_temp.assert((select tone::text from public.restaurants) = 'divertido', 'Ana edita su restaurante');

-- No puede hacer el onboarding dos veces
do $$ begin
  perform public.create_restaurant_with_org('Otro', 'otro', null, null, null, 'cercano', null, null, null);
  raise exception 'FALLO: onboarding duplicado';
exception when raise_exception then
  if sqlerrm <> 'already_onboarded' then raise; end if;
end $$;
reset role;

-- ── Visitante anónimo ──
select pg_temp.as_anon();
do $$ begin
  perform 1 from public.restaurants;
  raise exception 'FALLO: un anónimo pudo leer restaurantes';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.create_restaurant_with_org('X', 'x-x', null, null, null, 'cercano', null, null, null);
  raise exception 'FALLO: un anónimo pudo crear un restaurante';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.is_org_member(gen_random_uuid());
  raise exception 'FALLO: un anónimo pudo llamar a is_org_member';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Validaciones de datos ──
do $$ begin
  insert into public.restaurants (org_id, name, slug)
  select id, 'Mal', 'Slug Con Espacios' from public.organizations limit 1;
  raise exception 'FALLO: se aceptó un slug no válido';
exception when check_violation then null; end $$;

-- Borrar un usuario borra su perfil y su pertenencia
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.assert((select count(*) from public.profiles) = 1, 'borrado en cascada del perfil');
