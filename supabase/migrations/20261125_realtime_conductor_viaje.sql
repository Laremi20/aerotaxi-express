-- =============================================================================
-- Migración: publicar conductor y viaje en Supabase Realtime (postgres_changes).
-- Cubre: HU06; CU07 (disponibilidad en el Calendario), CU12 paso 4 (viaje nuevo en Mis viajes); CP-13.
-- Requiere: 20261102_modelo_multiflota.sql y 20261103_estado_conductor.sql.
-- Aplicación: pegar completo en el SQL Editor de Supabase. Es atómico (begin/commit) y se puede
-- aplicar más de una vez: solo agrega las tablas que aún no están en la publicación.
--
-- Seguridad: Realtime entrega un INSERT o UPDATE solo a los suscriptores que podrían leer esa fila
-- con su JWT (RLS de la tabla). Con las políticas actuales:
--   conductor → admin_lee_conductores (su flota) y conductor_lee_su_perfil (su fila);
--   viaje     → admin_lee_viajes (su flota) y conductor_lee_sus_viajes (driver_id = auth.uid()).
-- Un administrador no recibe cambios de otra flota (CP-17). No se publican cotizacion, viaje_evento,
-- flota ni tarifa. No hay DELETE físico en estas tablas (los DELETE no pasan por RLS en Realtime).
-- Replica identity por defecto: el UPDATE trae la fila nueva completa, suficiente para la interfaz.
-- =============================================================================

begin;

do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array['conductor', 'viaje'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_tabla) then
      execute format('alter publication supabase_realtime add table public.%I', v_tabla);
    end if;
  end loop;
end $$;

commit;
