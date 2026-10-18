-- Mesa5 · Migración 2: permisos de las funciones auxiliares (fase 1B)
-- Las funciones de las políticas solo las necesita quien ha iniciado sesión.
-- Un visitante anónimo no debe poder llamarlas por /rest/v1/rpc.
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_org_owner(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
