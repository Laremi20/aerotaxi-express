-- =============================================================================
-- Verificación de 20261125_realtime_conductor_viaje.sql (HU06; CU07, CU12; CP-13).
-- Aplicación: pegar completo en el SQL Editor después de la migración, o `npm run verificar:sql`.
-- Solo lee catálogos: no crea datos.
-- Que Realtime respete RLS no se puede probar aquí (es un servicio aparte): se apoya en las
-- políticas de SELECT ya verificadas (CP-16, CP-17) y en la prueba manual con dos navegadores.
-- Resultado: una fila por caso; la columna «ok» debe ser true en todas.
-- =============================================================================

with casos (n, caso, esperado, obtenido) as (
  values
    (1, 'HU06 conductor está publicada en supabase_realtime', 'true',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conductor')::text),
    (2, 'HU06 viaje está publicada en supabase_realtime', 'true',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'viaje')::text),
    (3, 'Minimización: solo conductor y viaje de public están publicadas', 'conductor,viaje',
     (select string_agg(tablename, ',' order by tablename) from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public')),
    (4, 'HU08 conductor tiene RLS activa (Realtime filtra con sus políticas)', 'true',
     (select relrowsecurity::text from pg_class where oid = 'public.conductor'::regclass)),
    (5, 'HU08 viaje tiene RLS activa (Realtime filtra con sus políticas)', 'true',
     (select relrowsecurity::text from pg_class where oid = 'public.viaje'::regclass)),
    (6, 'La publicación emite inserciones y actualizaciones', 'true,true',
     (select pubinsert::text || ',' || pubupdate::text from pg_publication where pubname = 'supabase_realtime'))
)
select n, caso, esperado, obtenido, esperado is not distinct from obtenido as ok
from casos
order by n;
