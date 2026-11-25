-- =============================================================================
-- Volumen del Historial (HU07; CU10; SLA-03; CP-14 y CP-15 con volumen de un mes).
-- Genera un mes de viajes sintéticos (600) en la flota demo, mide con EXPLAIN ANALYZE la consulta
-- de 30 días que hace la pantalla /historial (con RLS, como el administrador) y lo revierte todo.
-- Aplicación: pegar completo en el SQL Editor de Supabase después de las migraciones y del seed,
-- o `npm run verificar:sql` (PGlite, también en la CI).
-- No deja datos: todo lo que crea se revierte al final (excepción interna ZT999 = rollback).
-- Los viajes se crean dos años en el futuro para no chocar con viajes reales (EXCLUDE sin_topes),
-- así que no hace falta borrar nada.
-- Resultado: una fila por caso; la columna «ok» debe ser true en todas. El caso SLA-03 muestra en su
-- nombre el tiempo medido y si el plan usó el índice viaje_flota_franja.
-- =============================================================================

-- Cambia el rol y el JWT simulado de la sesión (nombre propio: comparte sesión con otros scripts)
create function pg_temp.vol_como(p_rol text, p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    coalesce(json_build_object('sub', p_uid, 'role', p_rol)::text, ''), true);
  perform set_config('role', p_rol, true);
end $$;

create function pg_temp.verificar_volumen()
returns table (n int, caso text, esperado text, obtenido text, ok boolean)
language plpgsql as $$
declare
  res        text[] := '{}';
  v_admin    uuid := (select id from auth.users where email = 'admin.demo@example.com');
  v_flota    uuid;
  v_tarifa   bigint;
  v_choferes uuid[];
  v_cot      bigint[];
  v_completar bigint[];
  v_cancelar bigint[];
  -- Un mes completo, dos años en el futuro, en días de Santiago
  v_desde    timestamptz := (date_trunc('day', now() at time zone 'America/Santiago') + interval '730 days')
                            at time zone 'America/Santiago';
  v_hasta    timestamptz;
  v_sql      text;
  v_plan     json;
  v_ms       numeric;
  v_indice   boolean;
  v_total    int;
begin
  v_hasta := ((v_desde at time zone 'America/Santiago') + interval '30 days') at time zone 'America/Santiago';

  begin
    select flota_id into v_flota from public.flota where admin_id = v_admin;
    select tarifa_id into v_tarifa from public.tarifa where flota_id = v_flota and is_active;
    select array_agg(driver_id order by nombre) into v_choferes
    from public.conductor where flota_id = v_flota and is_active;
    if v_tarifa is null or v_choferes is null then
      raise exception 'Ejecuta primero supabase/seed.sql';
    end if;

    -- Preparación (rol original, sin RLS): 30 días × 20 viajes, repartidos entre los conductores.
    -- Cada conductor recibe franjas de 60 min cada 70 min desde las 06:00: nunca se superponen.
    with nuevas as (
      insert into public.cotizacion (flota_id, tarifa_id, creado_por, destino_texto, distancia_km,
        metodo_calculo, tarifa_calculada, estado, iniciada_at, confirmada_at)
      select v_flota, v_tarifa, v_admin, 'Destino sintético ' || g, 5 + (g % 40), 'HAVERSINE',
             8000 + (g % 40) * 1000, 'CONFIRMADA', now(), now()
      from generate_series(0, 599) as g
      returning cotizacion_id
    )
    select array_agg(cotizacion_id order by cotizacion_id) into v_cot from nuevas;

    insert into public.viaje (cotizacion_id, flota_id, driver_id, franja_inicio, franja_fin, tarifa, asignado_por)
    select v_cot[g + 1], v_flota,
           v_choferes[(g % 20) % array_length(v_choferes, 1) + 1],
           v_desde + (g / 20) * interval '1 day' + interval '6 hours'
                   + ((g % 20) / array_length(v_choferes, 1)) * interval '70 minutes',
           v_desde + (g / 20) * interval '1 day' + interval '7 hours'
                   + ((g % 20) / array_length(v_choferes, 1)) * interval '70 minutes',
           0, v_admin
    from generate_series(0, 599) as g;

    -- Estados como en la operación: 70 % completados, 10 % cancelados, 20 % asignados.
    -- Pasan por el trigger de transiciones y dejan su bitácora (tg_viaje_evento).
    v_completar := array(select v_cot[g + 1] from generate_series(0, 599) g where g % 10 < 7);
    v_cancelar := array(select v_cot[g + 1] from generate_series(0, 599) g where g % 10 = 7);
    update public.viaje set estado = 'ACTIVO' where cotizacion_id = any (v_completar);
    update public.viaje
    set estado = 'COMPLETADO', km_reales = 5 + (viaje_id % 40) + 0.35, completado_at = franja_fin
    where cotizacion_id = any (v_completar);
    update public.viaje set estado = 'CANCELADO', observacion = 'Cancelación sintética'
    where cotizacion_id = any (v_cancelar);

    -- Consulta equivalente a la de /historial (src/lib/historial/consulta.ts)
    v_sql := format($q$
      select v.viaje_id, v.driver_id, v.franja_inicio, v.franja_fin, v.tarifa, v.estado, v.km_reales,
             v.observacion, q.destino_texto, q.distancia_km, c.nombre, c.patente
      from public.viaje v
      left join public.cotizacion q on q.cotizacion_id = v.cotizacion_id
      left join public.conductor c on c.driver_id = v.driver_id
      where v.flota_id = %L and v.franja_inicio >= %L and v.franja_inicio < %L
      order by v.franja_inicio, v.viaje_id$q$, v_flota, v_desde, v_hasta);

    -- Como el administrador: RLS activa (admin_lee_viajes, admin_lee_cotizaciones, admin_lee_conductores)
    perform pg_temp.vol_como('authenticated', v_admin);
    execute format('select count(*) from (%s) s', v_sql) into v_total;
    res := res || array[['CP-14 el administrador ve el mes completo', '600', v_total::text]];

    execute 'explain (analyze, format json) ' || v_sql into v_plan;
    v_ms := (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_indice := v_plan::text like '%viaje_flota_franja%';
    res := res || array[[
      format('SLA-03 consulta de 30 días ≤ 3 s (medido: %s ms; índice viaje_flota_franja: %s)',
             round(v_ms, 1), case when v_indice then 'sí' else 'no' end),
      'cumple',
      case when v_ms <= 3000 then 'cumple' else 'no cumple' end]];

    select count(*) into v_total
    from public.viaje_evento e
    join public.viaje v on v.viaje_id = e.viaje_id
    where v.flota_id = v_flota and v.franja_inicio >= v_desde and v.franja_inicio < v_hasta;
    -- 600 creaciones + 420 × 2 (ACTIVO y COMPLETADO) + 60 cancelaciones
    res := res || array[['CP-15 bitácora del mes visible para el administrador', '1500', v_total::text]];

    -- Monto completado del mes = suma de las tarifas de sus cotizaciones (RN-06, trigger de congelamiento)
    res := res || array[['SP3.1 el monto completado del mes usa la tarifa congelada (RN-06)',
      (select sum(tarifa_calculada)::text from public.cotizacion where cotizacion_id = any (v_completar)),
      (select coalesce(sum(tarifa) filter (where estado = 'COMPLETADO'), 0)::text
       from public.viaje
       where flota_id = v_flota and franja_inicio >= v_desde and franja_inicio < v_hasta)]];

    -- Un usuario sin flota no ve nada del mes (HU08)
    perform pg_temp.vol_como('authenticated', gen_random_uuid());
    execute format('select count(*) from (%s) s', v_sql) into v_total;
    res := res || array[['HU08 otro usuario no ve los viajes del mes', '0', v_total::text]];

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

select * from pg_temp.verificar_volumen();
