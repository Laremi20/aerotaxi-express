-- =============================================================================
-- Migración: estado de disponibilidad del conductor y RPC de «Mis viajes».
-- Cubre: HU06 (sin Realtime), CU13; RN-11, RN-12, RN-13.
-- Requiere: 20261102_modelo_multiflota.sql.
-- Aplicación: pegar completo en el SQL Editor de Supabase. Es atómico (begin/commit).
--
-- Códigos de error propios de fn_cambiar_estado_viaje (la interfaz los traduce por código):
--   ATX01 = el viaje aún no puede iniciarse (antes de franja_inicio − 30 min, §3.4.1)
--   ATX02 = transición no permitida desde el estado actual del viaje (RN-11)
-- Los demás se mantienen: P0002 = viaje no encontrado o ajeno; 23514 = km reales ≤ 0;
-- 42501 = estado que el conductor no puede pedir.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. RPC del conductor (reemplaza la de 20261102; misma firma, así se conservan los grant)
--    Ahora revisa el estado actual: antes, un viaje COMPLETADO se podía «completar» de nuevo
--    y se sobrescribían km_reales y completado_at sin evento en la bitácora.
-- -----------------------------------------------------------------------------

create or replace function public.fn_cambiar_estado_viaje(
  p_viaje_id bigint, p_nuevo_estado varchar, p_km_reales numeric default null)
returns public.viaje
language plpgsql security definer
set search_path = ''
as $$
declare
  v_viaje public.viaje;
begin
  select * into v_viaje
  from public.viaje
  where viaje_id = p_viaje_id and driver_id = auth.uid()
  for update;

  if not found then
    raise exception 'Viaje no encontrado' using errcode = 'no_data_found';
  end if;

  if p_nuevo_estado = 'ACTIVO' then
    if v_viaje.estado <> 'ASIGNADO' then
      raise exception 'Solo se inicia un viaje ASIGNADO (estado actual: %)', v_viaje.estado
        using errcode = 'ATX02';
    end if;
    -- Guarda del diagrama de estados (§3.4.1): no se inicia más de 30 min antes de la franja
    if now() < v_viaje.franja_inicio - interval '30 minutes' then
      raise exception 'El viaje solo puede iniciarse desde 30 minutos antes de su franja'
        using errcode = 'ATX01';
    end if;
    update public.viaje set estado = 'ACTIVO'
    where viaje_id = p_viaje_id
    returning * into v_viaje;
  elsif p_nuevo_estado = 'COMPLETADO' then
    if v_viaje.estado <> 'ACTIVO' then
      raise exception 'Solo se completa un viaje ACTIVO (estado actual: %)', v_viaje.estado
        using errcode = 'ATX02';
    end if;
    -- RN-12
    if p_km_reales is null or p_km_reales <= 0 then
      raise exception 'Los km reales deben ser mayores que 0' using errcode = 'check_violation';
    end if;
    update public.viaje set estado = 'COMPLETADO', km_reales = p_km_reales, completado_at = now()
    where viaje_id = p_viaje_id
    returning * into v_viaje;
  else
    raise exception 'El conductor solo puede iniciar o completar viajes'
      using errcode = 'insufficient_privilege';
  end if;

  return v_viaje;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Disponibilidad del conductor según sus viajes (HU06; CU13 pasos 2 y 4)
--    Es un trigger y no parte de la RPC para cubrir también el inicio hecho por el administrador.
--    El conductor no tiene permiso para actualizar su fila (RLS); solo cambia por aquí.
-- -----------------------------------------------------------------------------

create function public.tg_viaje_estado_conductor() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.estado = 'ACTIVO' then
    update public.conductor set estado_disponibilidad = 'EN_VIAJE'
    where driver_id = new.driver_id;
  elsif new.estado = 'COMPLETADO' then
    -- Queda libre solo si no tiene otro viaje en curso
    update public.conductor set estado_disponibilidad = 'DISPONIBLE'
    where driver_id = new.driver_id
      and not exists (select 1 from public.viaje v
                      where v.driver_id = new.driver_id
                        and v.estado = 'ACTIVO'
                        and v.viaje_id <> new.viaje_id);
  end if;
  return null;
end $$;

create trigger trg_viaje_estado_conductor after update of estado on public.viaje
for each row when (new.estado is distinct from old.estado)
execute function public.tg_viaje_estado_conductor();

commit;
