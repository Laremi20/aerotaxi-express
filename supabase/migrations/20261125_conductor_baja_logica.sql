-- =============================================================================
-- Migración: baja lógica del conductor (HU04; CU06 6b; CP-09).
-- Requiere: 20261102_modelo_multiflota.sql y 20261103_estado_conductor.sql.
-- Aplicación: pegar completo en el SQL Editor de Supabase. Es atómico (begin/commit).
--
-- 1. fn_cambiar_estado_viaje exige que el conductor de la sesión esté activo: un conductor dado
--    de baja con su JWT aún vigente (hasta 1 h) ya no puede iniciar ni completar viajes (42501).
-- 2. La baja (is_active true → false) se rechaza si el conductor tiene viajes ASIGNADO o ACTIVO.
--    Código propio: ATX03 = conductor con viajes pendientes (la interfaz lo traduce por código).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. RPC del conductor (reemplaza la de 20261103; misma firma, así se conservan los grant).
--    Idéntica salvo la condición de conductor activo.
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
  -- HU04: un conductor dado de baja no opera, aunque su sesión siga vigente
  if not exists (select 1 from public.conductor
                 where driver_id = auth.uid() and is_active) then
    raise exception 'El conductor no está activo' using errcode = 'insufficient_privilege';
  end if;

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
-- 2. Baja con viajes pendientes (CU06 6b): primero se cancelan o completan.
--    Security definer para no depender de lo que RLS deje ver a quien hace la baja.
--    Solo actúa en la transición true → false: editar o reactivar no se bloquea.
-- -----------------------------------------------------------------------------

create function public.tg_conductor_baja() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.viaje v
             where v.driver_id = new.driver_id
               and v.estado in ('ASIGNADO', 'ACTIVO')) then
    raise exception 'El conductor tiene viajes asignados o en curso'
      using errcode = 'ATX03';
  end if;
  return new;
end $$;

create trigger trg_conductor_baja before update of is_active on public.conductor
for each row when (old.is_active and not new.is_active)
execute function public.tg_conductor_baja();

commit;
