-- =============================================================================
-- Verificación de 20261125_conductor_baja_logica.sql (HU04; CU06 6b; CP-09).
-- Aplicación: pegar completo en el SQL Editor después de la migración y del seed,
-- o `npm run verificar:sql` (PGlite, también en la CI).
-- No deja datos: todo lo que crea o cambia se revierte al final (ZT999). No borra filas.
-- Resultado: una fila por caso; la columna «ok» debe ser true en todas.
-- Códigos: OK = sin error; ATX03 = conductor con viajes pendientes; 42501 = sin permiso.
-- =============================================================================

-- Ejecuta una sentencia y devuelve 'OK' o el SQLSTATE del error (sin abortar)
create function pg_temp.probar_baja(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'OK';
exception when others then
  return sqlstate;
end $$;

-- Cambia el rol y el JWT simulado de la sesión ('none' vuelve al rol original)
create function pg_temp.como_baja(p_rol text, p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    coalesce(json_build_object('sub', p_uid, 'role', p_rol)::text, ''), true);
  perform set_config('role', p_rol, true);
end $$;

create function pg_temp.verificar_baja()
returns table (n int, caso text, esperado text, obtenido text, ok boolean)
language plpgsql as $$
declare
  res       text[] := '{}';
  v_admin   uuid := (select id from auth.users where email = 'admin.demo@example.com');
  v_c1      uuid := (select id from auth.users where email = 'conductor1.demo@example.com');
  v_flota   uuid;
  v_tarifa  bigint;
  v_cot     bigint;
  v_cot2    bigint;
  v_viaje   bigint;
  v_viaje2  bigint;
  v_viajes  text;
  -- Lejos en el futuro para no chocar (sin_topes) con viajes reales del conductor
  v_ini     timestamptz := date_trunc('hour', now()) + interval '400 days';
  v_baja    text;
  v_alta    text;
begin
  begin
    select flota_id into v_flota from public.flota where admin_id = v_admin;
    select tarifa_id into v_tarifa from public.tarifa where flota_id = v_flota and is_active;
    if v_tarifa is null or v_c1 is null then
      raise exception 'Ejecuta primero supabase/seed.sql';
    end if;
    v_baja := format('update public.conductor set is_active = false where driver_id = %L', v_c1);
    v_alta := format('update public.conductor set is_active = true where driver_id = %L', v_c1);

    -- Preparación (rol original, sin RLS): el conductor 1 queda activo y sin viajes pendientes.
    -- Sin DELETE: los pendientes reales se cancelan o completan (se revierte al final).
    update public.conductor set is_active = true where driver_id = v_c1;
    update public.viaje set estado = 'CANCELADO' where driver_id = v_c1 and estado = 'ASIGNADO';
    update public.viaje set estado = 'COMPLETADO', km_reales = 1, completado_at = now()
    where driver_id = v_c1 and estado = 'ACTIVO';

    insert into public.cotizacion (flota_id, tarifa_id, creado_por, destino_texto, distancia_km,
      metodo_calculo, tarifa_calculada, estado, iniciada_at, confirmada_at)
    values (v_flota, v_tarifa, v_admin, 'Baja de prueba 1', 20, 'HAVERSINE', 22000, 'CONFIRMADA', now(), now())
    returning cotizacion_id into v_cot;
    insert into public.cotizacion (flota_id, tarifa_id, creado_por, destino_texto, distancia_km,
      metodo_calculo, tarifa_calculada, estado, iniciada_at, confirmada_at)
    values (v_flota, v_tarifa, v_admin, 'Baja de prueba 2', 20, 'HAVERSINE', 22000, 'CONFIRMADA', now(), now())
    returning cotizacion_id into v_cot2;

    insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio, franja_fin, tarifa, asignado_por)
    values (v_cot, v_flota, v_c1, v_ini, v_ini + interval '1 hour', 22000, v_admin)
    returning viaje_id into v_viaje;

    -- Administrador de la flota (CU06 6b)
    perform pg_temp.como_baja('authenticated', v_admin);
    res := res || array[['CU06 6b baja con viaje ASIGNADO rechazada', 'ATX03', pg_temp.probar_baja(v_baja)]];
    res := res || array[['El conductor sigue activo tras el rechazo', 'true',
      (select is_active::text from public.conductor where driver_id = v_c1)]];
    res := res || array[['Editar un conductor con viajes pendientes', 'OK',
      pg_temp.probar_baja(format('update public.conductor set contacto = contacto where driver_id = %L', v_c1))]];

    perform pg_temp.como_baja('none', null);
    update public.viaje set estado = 'ACTIVO' where viaje_id = v_viaje;
    perform pg_temp.como_baja('authenticated', v_admin);
    res := res || array[['CU06 6b baja con viaje ACTIVO rechazada', 'ATX03', pg_temp.probar_baja(v_baja)]];

    perform pg_temp.como_baja('none', null);
    update public.viaje set estado = 'COMPLETADO', km_reales = 20, completado_at = now() where viaje_id = v_viaje;
    select count(*)::text into v_viajes from public.viaje where driver_id = v_c1;
    perform pg_temp.como_baja('authenticated', v_admin);
    res := res || array[['CP-09 baja sin viajes pendientes', 'OK', pg_temp.probar_baja(v_baja)]];
    res := res || array[['CP-09 el conductor queda inactivo', 'false',
      (select is_active::text from public.conductor where driver_id = v_c1)]];
    res := res || array[['CP-09 el historial del conductor queda intacto', v_viajes,
      (select count(*)::text from public.viaje where driver_id = v_c1)]];
    res := res || array[['Editar un conductor inactivo', 'OK',
      pg_temp.probar_baja(format('update public.conductor set contacto = contacto where driver_id = %L', v_c1))]];

    -- Viaje heredado de un conductor ya inactivo (solo posible con datos previos a esta migración)
    perform pg_temp.como_baja('none', null);
    insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio, franja_fin, tarifa, asignado_por)
    values (v_cot2, v_flota, v_c1, now() + interval '10 minutes', now() + interval '40 minutes', 22000, v_admin)
    returning viaje_id into v_viaje2;

    perform pg_temp.como_baja('authenticated', v_c1);
    res := res || array[['HU04 conductor inactivo no inicia viajes (RPC)', '42501',
      pg_temp.probar_baja(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_viaje2, 'ACTIVO'))]];
    perform pg_temp.como_baja('none', null);
    res := res || array[['El viaje del conductor inactivo no cambia', 'ASIGNADO',
      (select estado from public.viaje where viaje_id = v_viaje2)]];

    perform pg_temp.como_baja('authenticated', v_admin);
    res := res || array[['Reactivar al conductor', 'OK', pg_temp.probar_baja(v_alta)]];
    perform pg_temp.como_baja('authenticated', v_c1);
    res := res || array[['Conductor reactivado inicia su viaje (RPC)', 'OK',
      pg_temp.probar_baja(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_viaje2, 'ACTIVO'))]];
    perform pg_temp.como_baja('authenticated', v_admin);
    res := res || array[['Un administrador no se salta la regla de baja', 'ATX03', pg_temp.probar_baja(v_baja)]];

    -- La RPC conserva security definer, search_path vacío y permisos
    perform pg_temp.como_baja('none', null);
    res := res || array[['fn_cambiar_estado_viaje sigue siendo security definer', 'true',
      (select prosecdef::text from pg_proc
       where oid = 'public.fn_cambiar_estado_viaje(bigint, varchar, numeric)'::regprocedure)]];
    res := res || array[['fn_cambiar_estado_viaje conserva search_path vacío', 'search_path=""',
      (select array_to_string(proconfig, ',') from pg_proc
       where oid = 'public.fn_cambiar_estado_viaje(bigint, varchar, numeric)'::regprocedure)]];
    res := res || array[['authenticated ejecuta la RPC; anon no', 'true,false',
      has_function_privilege('authenticated', 'public.fn_cambiar_estado_viaje(bigint, varchar, numeric)', 'execute')::text
      || ',' ||
      has_function_privilege('anon', 'public.fn_cambiar_estado_viaje(bigint, varchar, numeric)', 'execute')::text]];

    -- Revierte todo lo anterior (datos y cambio de rol)
    raise exception using errcode = 'ZT999';
  exception when sqlstate 'ZT999' then
    null;
  end;

  for i in 1..coalesce(array_length(res, 1), 0) loop
    n := i;
    caso := res[i][1];
    esperado := res[i][2];
    obtenido := res[i][3];
    ok := esperado is not distinct from obtenido;
    return next;
  end loop;
end $$;

select * from pg_temp.verificar_baja();
