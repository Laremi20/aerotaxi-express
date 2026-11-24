-- =============================================================================
-- Verificación de 20261102_modelo_multiflota.sql + 20261103_estado_conductor.sql +
-- 20261123_fn_salud.sql + seed.sql.
-- Cubre: CP-10, CP-11 (HU05), HU06 (estado del conductor), CP-16, CP-17, CP-18 (HU08);
--        CP-19 (HU09, fn_salud); CU12, CU13; RN-06, RN-09, RN-10, RN-11, RN-12, RN-13.
-- Aplicación: pegar completo en el SQL Editor después de las migraciones y del seed,
-- o `npm run verificar:sql` (PGlite, también en la CI).
-- No deja datos: todo lo que crea se revierte al final.
-- Resultado: una fila por caso; la columna «ok» debe ser true en todas.
-- Códigos: OK = sin error; 23P01 = exclusión; 23505 = única; 23514 = check;
--          42501 = sin permiso o rechazado por RLS; P0001/P0002 = error de función;
--          ATX01 = viaje aún no iniciable (30 min); ATX02 = transición no permitida (RPC).
-- =============================================================================

-- Ejecuta una sentencia y devuelve 'OK' o el SQLSTATE del error (sin abortar)
create function pg_temp.probar(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'OK';
exception when others then
  return sqlstate;
end $$;

-- Cambia el rol y el JWT simulado de la sesión ('none' vuelve al rol original)
create function pg_temp.como(p_rol text, p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    coalesce(json_build_object('sub', p_uid, 'role', p_rol)::text, ''), true);
  perform set_config('role', p_rol, true);
end $$;

create function pg_temp.sql_viaje(p_cot bigint, p_flota uuid, p_driver uuid,
                                  p_ini timestamptz, p_fin timestamptz, p_asignado uuid)
returns text
language sql as $$
  select format('insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio,
                   franja_fin, tarifa, asignado_por) values (%s, %L, %L, %L, %L, 22000, %L)',
                p_cot, p_flota, p_driver, p_ini, p_fin, p_asignado);
$$;

create function pg_temp.verificar()
returns table (n int, caso text, esperado text, obtenido text, ok boolean)
language plpgsql as $$
declare
  res      text[] := '{}';
  v_admin  uuid := (select id from auth.users where email = 'admin.demo@example.com');
  v_c1     uuid := (select id from auth.users where email = 'conductor1.demo@example.com');
  v_c2     uuid := (select id from auth.users where email = 'conductor2.demo@example.com');
  v_c3     uuid := (select id from auth.users where email = 'conductor3.demo@example.com');
  v_flota  uuid;
  v_flota_b uuid;
  v_tarifa bigint;
  v_tarifa_b bigint;
  v_cot    bigint[] := '{}';
  v_borrador bigint;
  v_v1     bigint;   -- conductor 1, mañana
  v_v2     bigint;   -- conductor 2, mañana (se cancela)
  v_v3     bigint;   -- conductor 1, empieza en 10 min (para la RPC)
  v_v4     bigint;   -- conductor 2, ACTIVO
  v_v5     bigint;   -- conductor 1, ACTIVO desde hace 90 min (otro viaje en curso)
  v_ini    timestamptz := date_trunc('hour', now()) + interval '1 day';
  v_id     bigint;
  v_txt    text;
  v_esp    text;
  i        int;
begin
  begin
    select flota_id into v_flota from public.flota where admin_id = v_admin;
    select tarifa_id into v_tarifa from public.tarifa where flota_id = v_flota and is_active;
    if v_tarifa is null then
      raise exception 'Ejecuta primero supabase/seed.sql';
    end if;

    -- Aísla la prueba de los datos reales: los viajes que ya tengan los conductores demo chocarían
    -- con los de prueba (sin_topes, 23P01) y alterarían los conteos. Se revierte al final (ZT999).
    -- La bitácora va primero porque viaje_evento referencia a viaje sin cascada.
    delete from public.viaje_evento
    where viaje_id in (select viaje_id from public.viaje where driver_id in (v_c1, v_c2, v_c3));
    delete from public.viaje where driver_id in (v_c1, v_c2, v_c3);
    update public.conductor set estado_disponibilidad = 'DISPONIBLE', is_active = true
    where driver_id in (v_c1, v_c2, v_c3);

    -- Preparación (rol original, sin RLS)
    for i in 1..9 loop
      insert into public.cotizacion (flota_id, tarifa_id, creado_por, destino_texto, distancia_km,
        metodo_calculo, tarifa_calculada, estado, iniciada_at, confirmada_at)
      values (v_flota, v_tarifa, v_admin, 'Destino de prueba ' || i, 20, 'HAVERSINE', 22000 + i * 100,
        'CONFIRMADA', now(), now())
      returning cotizacion_id into v_id;
      v_cot := v_cot || v_id;
    end loop;

    insert into public.cotizacion (flota_id, tarifa_id, creado_por, destino_texto, distancia_km,
      metodo_calculo, tarifa_calculada, iniciada_at)
    values (v_flota, v_tarifa, v_admin, 'Borrador de prueba', 20, 'HAVERSINE', 22000, now())
    returning cotizacion_id into v_borrador;

    insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio, franja_fin, tarifa, asignado_por)
    values (v_cot[1], v_flota, v_c1, v_ini, v_ini + interval '1 hour', 22000, v_admin)
    returning viaje_id into v_v1;

    -- Integridad (HU05)
    res := res || array[['CP-10 franja superpuesta del mismo conductor', '23P01',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[2], v_flota, v_c1, v_ini + interval '30 minutes',
                                       v_ini + interval '90 minutes', v_admin))]];
    res := res || array[['CP-11 franja contigua [) del mismo conductor', 'OK',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[2], v_flota, v_c1, v_ini + interval '1 hour',
                                       v_ini + interval '2 hours', v_admin))]];
    res := res || array[['Otro conductor en la misma franja', 'OK',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[3], v_flota, v_c2, v_ini, v_ini + interval '1 hour', v_admin))]];
    res := res || array[['chk_franja: fin igual al inicio', '23514',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[4], v_flota, v_c3, v_ini, v_ini, v_admin))]];
    res := res || array[['RN-10 segunda asignación de la misma cotización', '23505',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[1], v_flota, v_c3, v_ini + interval '5 hours',
                                       v_ini + interval '6 hours', v_admin))]];
    res := res || array[['RN-11 viaje nuevo en estado ACTIVO', 'P0001',
      pg_temp.probar(format('insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio,
                               franja_fin, tarifa, asignado_por, estado)
                             values (%s, %L, %L, %L, %L, 22000, %L, %L)',
                            v_cot[4], v_flota, v_c3, v_ini, v_ini + interval '1 hour', v_admin, 'ACTIVO'))]];

    select viaje_id into v_v2 from public.viaje where cotizacion_id = v_cot[3];
    res := res || array[['RN-11 ASIGNADO → COMPLETADO', 'P0001',
      pg_temp.probar(format('update public.viaje set estado = %L, km_reales = 10, completado_at = now()
                             where viaje_id = %s', 'COMPLETADO', v_v1))]];
    res := res || array[['Cancelar viaje ASIGNADO', 'OK',
      pg_temp.probar(format('update public.viaje set estado = %L where viaje_id = %s', 'CANCELADO', v_v2))]];
    res := res || array[['RN-11 CANCELADO → ACTIVO', 'P0001',
      pg_temp.probar(format('update public.viaje set estado = %L where viaje_id = %s', 'ACTIVO', v_v2))]];
    res := res || array[['Viaje CANCELADO libera la franja', 'OK',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[4], v_flota, v_c2, v_ini, v_ini + interval '1 hour', v_admin))]];
    res := res || array[['RN-13 bitácora del viaje cancelado (ASIGNADO, CANCELADO)', '2',
      (select count(*)::text from public.viaje_evento where viaje_id = v_v2)]];

    -- Datos para RLS: viaje del conductor 1 que empieza en 10 min, y una flota ajena
    insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio, franja_fin, tarifa, asignado_por)
    values (v_cot[5], v_flota, v_c1, now() + interval '10 minutes', now() + interval '40 minutes', 22000, v_admin)
    returning viaje_id into v_v3;

    -- Viaje ACTIVO del conductor 2 (para probar que no se reprograma)
    insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio, franja_fin, tarifa, asignado_por)
    values (v_cot[8], v_flota, v_c2, now() + interval '5 minutes', now() + interval '35 minutes', 22000, v_admin)
    returning viaje_id into v_v4;
    update public.viaje set estado = 'ACTIVO' where viaje_id = v_v4;
    res := res || array[['HU06 viaje ACTIVO deja al conductor EN_VIAJE', 'EN_VIAJE',
      (select estado_disponibilidad from public.conductor where driver_id = v_c2)]];

    -- Viaje ACTIVO del conductor 1 que empezó hace 90 min (no se cruza con v_v3)
    insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio, franja_fin, tarifa, asignado_por)
    values (v_cot[9], v_flota, v_c1, now() - interval '90 minutes', now() - interval '30 minutes', 22000, v_admin)
    returning viaje_id into v_v5;
    update public.viaje set estado = 'ACTIVO' where viaje_id = v_v5;

    insert into public.flota (nombre, admin_id) values ('Flota ajena', v_c3) returning flota_id into v_flota_b;
    insert into public.tarifa (flota_id, nombre, tarifa_base, valor_km, vigente_desde)
    values (v_flota_b, 'Tarifa ajena', 1000, 500, current_date) returning tarifa_id into v_tarifa_b;
    insert into public.cotizacion (flota_id, tarifa_id, creado_por, destino_texto, distancia_km,
      metodo_calculo, tarifa_calculada, iniciada_at)
    values (v_flota_b, v_tarifa_b, v_c3, 'Cotización ajena', 10, 'HAVERSINE', 6000, now());
    update public.conductor set is_active = false where driver_id = v_c3;

    select count(*)::text into v_esp from public.viaje where driver_id = v_c1;

    -- Conductor 1 (CP-17)
    perform pg_temp.como('authenticated', v_c1);
    res := res || array[['CP-17 conductor ve solo sus viajes', v_esp,
      (select count(*)::text from public.viaje)]];
    res := res || array[['CU12 conductor ve solo las cotizaciones de sus viajes', v_esp,
      (select count(*)::text from public.cotizacion)]];
    res := res || array[['CU12 conductor lee el destino de su viaje', 'Destino de prueba 1',
      (select q.destino_texto from public.viaje v
       join public.cotizacion q on q.cotizacion_id = v.cotizacion_id
       where v.viaje_id = v_v1)]];
    res := res || array[['Conductor no ve la cotización de otro conductor', '0',
      (select count(*)::text from public.cotizacion where cotizacion_id = v_cot[3])]];
    res := res || array[['Conductor ve solo su perfil', '1',
      (select count(*)::text from public.conductor)]];
    perform pg_temp.probar(format('update public.viaje set estado = %L where viaje_id = %s', 'ACTIVO', v_v3));
    res := res || array[['UPDATE directo del conductor no cambia el viaje', 'ASIGNADO',
      (select estado from public.viaje where viaje_id = v_v3)]];
    res := res || array[['RPC: iniciar viaje de mañana (guarda 30 min)', 'ATX01',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_v1, 'ACTIVO'))]];
    res := res || array[['RN-11 RPC: completar viaje ASIGNADO', 'ATX02',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L, 10)', v_v1, 'COMPLETADO'))]];
    res := res || array[['RPC: iniciar viaje propio', 'OK',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_v3, 'ACTIVO'))]];
    res := res || array[['HU06 al iniciar, el conductor queda EN_VIAJE', 'EN_VIAJE',
      (select estado_disponibilidad from public.conductor where driver_id = v_c1)]];
    res := res || array[['RN-11 RPC: iniciar dos veces el mismo viaje', 'ATX02',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_v3, 'ACTIVO'))]];
    res := res || array[['RN-12 RPC: completar sin km reales', '23514',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_v3, 'COMPLETADO'))]];
    res := res || array[['RPC: completar con km reales', 'OK',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L, 12.5)', v_v3, 'COMPLETADO'))]];
    res := res || array[['HU06 con otro viaje ACTIVO, el conductor sigue EN_VIAJE', 'EN_VIAJE',
      (select estado_disponibilidad from public.conductor where driver_id = v_c1)]];
    res := res || array[['RN-11 RPC: completar de nuevo un viaje COMPLETADO', 'ATX02',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L, 99)', v_v3, 'COMPLETADO'))]];
    res := res || array[['RN-12 los km del viaje completado no cambian', '12.50',
      (select km_reales::text from public.viaje where viaje_id = v_v3)]];
    res := res || array[['RPC: completar el último viaje ACTIVO', 'OK',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L, 30)', v_v5, 'COMPLETADO'))]];
    res := res || array[['HU06 sin viajes en curso, el conductor queda DISPONIBLE', 'DISPONIBLE',
      (select estado_disponibilidad from public.conductor where driver_id = v_c1)]];
    perform pg_temp.probar(format('update public.conductor set estado_disponibilidad = %L where driver_id = %L',
                                  'FUERA_DE_TURNO', v_c1));
    res := res || array[['HU08 conductor no cambia su disponibilidad directamente', 'DISPONIBLE',
      (select estado_disponibilidad from public.conductor where driver_id = v_c1)]];
    res := res || array[['RPC: viaje de otro conductor', 'P0002',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_v2, 'ACTIVO'))]];
    res := res || array[['Conductor no puede borrar viajes', '42501',
      pg_temp.probar(format('delete from public.viaje where viaje_id = %s', v_v3))]];

    perform pg_temp.como('none', null);
    res := res || array[['RN-13 bitácora del viaje completado (3 eventos)', '3',
      (select count(*)::text from public.viaje_evento where viaje_id = v_v3)]];
    res := res || array[['Bitácora registra al conductor como autor', v_c1::text,
      (select usuario_id::text from public.viaje_evento where viaje_id = v_v3 and estado_nuevo = 'COMPLETADO')]];
    select count(*)::text into v_esp from public.viaje where flota_id = v_flota;

    -- Administrador de la flota demo (CP-16)
    perform pg_temp.como('authenticated', v_admin);
    res := res || array[['CP-16 administrador ve los viajes de su flota', v_esp,
      (select count(*)::text from public.viaje)]];
    res := res || array[['CP-16 administrador no ve cotizaciones de otra flota', '0',
      (select count(*)::text from public.cotizacion where flota_id = v_flota_b)]];
    res := res || array[['Administrador ve solo su flota', '1',
      (select count(*)::text from public.flota)]];
    res := res || array[['Administrador no crea cotizaciones en otra flota', '42501',
      pg_temp.probar(format('insert into public.cotizacion (flota_id, tarifa_id, destino_texto, distancia_km,
                               metodo_calculo, tarifa_calculada, iniciada_at)
                             values (%L, %s, %L, 10, %L, 6000, now())',
                            v_flota_b, v_tarifa_b, 'Intrusa', 'HAVERSINE'))]];
    res := res || array[['Administrador crea cotización en su flota', 'OK',
      pg_temp.probar(format('insert into public.cotizacion (flota_id, tarifa_id, destino_texto, distancia_km,
                               metodo_calculo, tarifa_calculada, iniciada_at, recargos_aplicados, recargos_total)
                             values (%L, %s, %L, 10, %L, 11000, now(), %L, 500)',
                            v_flota, v_tarifa, 'Propia', 'HAVERSINE', '{"EQUIPAJE": 500}'))]];
    res := res || array[['RN-15 recargo desconocido rechazado', '23514',
      pg_temp.probar(format('insert into public.cotizacion (flota_id, tarifa_id, destino_texto, distancia_km,
                               metodo_calculo, tarifa_calculada, iniciada_at, recargos_aplicados)
                             values (%L, %s, %L, 10, %L, 11000, now(), %L)',
                            v_flota, v_tarifa, 'Propia', 'HAVERSINE', '{"PEAJE": 500}'))]];
    -- La política de INSERT de viaje lee cotizacion, y la de cotizacion lee viaje: 42P17 = recursión
    res := res || array[['Administrador asigna viaje a conductor activo (sin recursión RLS)', 'OK',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[6], v_flota, v_c2, v_ini + interval '8 hours',
                                       v_ini + interval '9 hours', v_admin))]];
    res := res || array[['RN-09 no asigna a conductor inactivo', '42501',
      pg_temp.probar(pg_temp.sql_viaje(v_cot[6], v_flota, v_c3, v_ini + interval '10 hours',
                                       v_ini + interval '11 hours', v_admin))]];
    res := res || array[['No asigna una cotización en BORRADOR', '42501',
      pg_temp.probar(pg_temp.sql_viaje(v_borrador, v_flota, v_c2, v_ini + interval '12 hours',
                                       v_ini + interval '13 hours', v_admin))]];
    res := res || array[['RN-06 administrador no cambia el monto del viaje', '42501',
      pg_temp.probar(format('update public.viaje set tarifa = 1 where viaje_id = %s', v_v1))]];
    res := res || array[['Administrador no completa viajes directamente', '42501',
      pg_temp.probar(format('update public.viaje set estado = %L, km_reales = 10, completado_at = now()
                             where viaje_id = %s', 'COMPLETADO', v_v1))]];
    res := res || array[['Administrador cancela viaje ASIGNADO', 'OK',
      pg_temp.probar(format('update public.viaje set estado = %L where viaje_id = %s', 'CANCELADO', v_v1))]];
    res := res || array[['RN-06 viaje con monto enviado por el cliente', 'OK',
      pg_temp.probar(format('insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio,
                               franja_fin, tarifa) values (%s, %L, %L, %L, %L, 1)',
                            v_cot[7], v_flota, v_c1, v_ini + interval '14 hours', v_ini + interval '15 hours'))]];
    res := res || array[['RN-06 el viaje copia tarifa_calculada de la cotización', '22700',
      (select tarifa::text from public.viaje where cotizacion_id = v_cot[7])]];
    res := res || array[['Administrador reprograma viaje ASIGNADO', 'OK',
      pg_temp.probar(format('update public.viaje set franja_inicio = franja_inicio + interval ''1 hour'',
                               franja_fin = franja_fin + interval ''1 hour'' where cotizacion_id = %s', v_cot[6]))]];
    res := res || array[['RN-11 no reprograma viaje ACTIVO', 'P0001',
      pg_temp.probar(format('update public.viaje set franja_fin = franja_fin + interval ''1 hour''
                             where viaje_id = %s', v_v4))]];
    res := res || array[['RN-11 no cambia el conductor de un viaje COMPLETADO', 'P0001',
      pg_temp.probar(format('update public.viaje set driver_id = %L where viaje_id = %s', v_c2, v_v3))]];
    res := res || array[['RN-11 no reprograma viaje CANCELADO', 'P0001',
      pg_temp.probar(format('update public.viaje set franja_inicio = franja_inicio - interval ''1 hour''
                             where viaje_id = %s', v_v1))]];
    res := res || array[['Administrador no puede borrar viajes', '42501',
      pg_temp.probar(format('delete from public.viaje where viaje_id = %s', v_v1))]];
    res := res || array[['Administrador lee la bitácora de su flota', 'true',
      (select (count(*) > 0)::text from public.viaje_evento)]];
    res := res || array[['Bitácora no se puede modificar', '42501',
      pg_temp.probar('update public.viaje_evento set estado_nuevo = ''X''')]];

    -- Anónimo (CP-18)
    perform pg_temp.como('anon', null);
    res := res || array[['CP-18 anónimo no lee viajes', '42501',
      pg_temp.probar('select count(*) from public.viaje')]];
    res := res || array[['CP-18 anónimo no lee flotas', '42501',
      pg_temp.probar('select count(*) from public.flota')]];
    res := res || array[['CP-18 anónimo no ejecuta la RPC', '42501',
      pg_temp.probar(format('select public.fn_cambiar_estado_viaje(%s, %L)', v_v1, 'ACTIVO'))]];

    -- Health check (HU09; CP-19): la única función que anon puede ejecutar
    res := res || array[['HU09 anónimo ejecuta fn_salud', 'OK',
      pg_temp.probar('select public.fn_salud()')]];
    res := res || array[['HU09 fn_salud no es security definer', 'false',
      (select prosecdef::text from pg_proc where oid = 'public.fn_salud()'::regprocedure)]];

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

select * from pg_temp.verificar();
