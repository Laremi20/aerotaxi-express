-- =============================================================================
-- Datos sintéticos para la demo EF2 (no son datos reales).
-- Requisito: crear antes en Authentication > Users estos 4 usuarios:
--   admin.demo@example.com, conductor1.demo@example.com,
--   conductor2.demo@example.com, conductor3.demo@example.com
-- Aplicación: pegar en el SQL Editor después de 20261102_modelo_multiflota.sql.
-- Se puede ejecutar varias veces: no duplica filas.
-- =============================================================================

do $$
declare
  v_correos   text[] := array['admin.demo@example.com', 'conductor1.demo@example.com',
                              'conductor2.demo@example.com', 'conductor3.demo@example.com'];
  v_faltantes text[];
  v_admin     uuid;
  v_flota     uuid;
begin
  select array_agg(c) into v_faltantes
  from unnest(v_correos) as c
  where not exists (select 1 from auth.users u where u.email = c);

  if v_faltantes is not null then
    raise exception 'Faltan usuarios en Authentication: %', array_to_string(v_faltantes, ', ');
  end if;

  select id into v_admin from auth.users where email = 'admin.demo@example.com';

  insert into public.flota (nombre, admin_id, radio_max_km)
  values ('Flota Demo SCL', v_admin, 100)
  on conflict (admin_id) do nothing;

  select flota_id into v_flota from public.flota where admin_id = v_admin;

  -- Valores reales de configuracion_reglas (id = 1): base 2000, km 800, coeficiente 1.25.
  -- Recargos que la Fase 1 tenía fijos en el código (RN-15).
  insert into public.tarifa (flota_id, nombre, tarifa_base, valor_km, coef_sinuosidad,
                             recargo_equipaje, recargo_mascota, recargo_nocturno, vigente_desde)
  select v_flota, 'Tarifa general', 2000, 800, 1.25, 500, 1000, 1500, date '2026-11-02'
  where not exists (select 1 from public.tarifa where flota_id = v_flota and is_active);

  insert into public.conductor (driver_id, flota_id, nombre, patente, contacto, email, estado_disponibilidad)
  select u.id, v_flota, d.nombre, d.patente, d.contacto, d.email, 'DISPONIBLE'
  from (values
    ('conductor1.demo@example.com', 'Conductor Demo Uno',  'DMTX11', '+56900000001'),
    ('conductor2.demo@example.com', 'Conductor Demo Dos',  'DMTX22', '+56900000002'),
    ('conductor3.demo@example.com', 'Conductor Demo Tres', 'DMTX33', '+56900000003')
  ) as d (email, nombre, patente, contacto)
  join auth.users u on u.email = d.email
  on conflict (driver_id) do nothing;
end $$;
