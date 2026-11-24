-- =============================================================================
-- Health check de GET /api/health (HU09; CP-19; Informe U2 §6.3 «Monitoreo y medición»).
-- anon no tiene permiso sobre ninguna tabla (Tabla 48), así que la «consulta liviana» (select 1)
-- se expone como RPC de PostgREST. Es security invoker: no toca tablas y no necesita privilegios
-- del dueño. No devuelve datos.
-- Aplicación: SQL Editor, después de 20261102 y 20261103.
-- =============================================================================

begin;

create function public.fn_salud() returns integer
language sql stable security invoker
set search_path = ''
as $$ select 1 $$;

revoke execute on function public.fn_salud() from public;
grant execute on function public.fn_salud() to anon, authenticated;

commit;
