-- =============================================================================
-- Migración: modelo multi-flota de la Fase 2 (Informe U2 §3.4, Anexos A y C).
-- Cubre: HU05 (sin topes), HU07 (bitácora), HU08 (RLS, Tablas 44 y 48);
--        RN-06, RN-07, RN-09, RN-10, RN-11, RN-12, RN-13, RN-15.
-- No modifica configuracion_reglas ni servicios_viajes (Fase 1).
-- Aplicación: pegar completo en el SQL Editor de Supabase. Es atómico (begin/commit).
-- =============================================================================

begin;

-- Necesaria para combinar igualdad (uuid) y rangos en un índice GiST (sin_topes)
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Tablas (Anexo A). Ninguna FK usa cascada (Tabla 45).
-- -----------------------------------------------------------------------------

-- Flota o gremio cliente: unidad de aislamiento multi-flota (Tabla 130)
create table public.flota (
  flota_id     uuid primary key default gen_random_uuid(),
  nombre       varchar(80) not null,
  admin_id     uuid not null unique references auth.users (id) on delete restrict,
  radio_max_km numeric(5,1) not null default 100 check (radio_max_km > 0),
  created_at   timestamptz not null default now()
);

-- Parámetros tarifarios por flota (Tabla 131) y montos de los recargos (RN-15)
create table public.tarifa (
  tarifa_id        bigint generated always as identity primary key,
  flota_id         uuid not null references public.flota (flota_id) on delete restrict,
  nombre           varchar(60) not null,
  tarifa_base      integer not null check (tarifa_base >= 0),
  valor_km         integer not null check (valor_km > 0),
  -- 1.25 es el valor real de configuracion_reglas (el informe dice 1,30; se corrige en el informe)
  coef_sinuosidad  numeric(3,2) not null default 1.25 check (coef_sinuosidad between 1.00 and 2.00),
  recargo_equipaje integer not null default 0 check (recargo_equipaje >= 0),
  recargo_mascota  integer not null default 0 check (recargo_mascota >= 0),
  recargo_nocturno integer not null default 0 check (recargo_nocturno >= 0),
  vigente_desde    date not null,
  is_active        boolean not null default true
);

-- RN-07: una sola tarifa activa por flota
create unique index tarifa_una_activa_por_flota on public.tarifa (flota_id) where is_active;

-- Conductor de una flota (Tabla 132); baja lógica con is_active (HU04)
create table public.conductor (
  driver_id             uuid primary key references auth.users (id) on delete restrict,
  flota_id              uuid not null references public.flota (flota_id) on delete restrict,
  nombre                varchar(80) not null,
  -- Formato chileno sin guiones: AB1234 (antiguo) o BCDF12 (actual)
  patente               varchar(8) not null unique
                        check (patente ~ '^([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2})$'),
  contacto              varchar(20) not null,
  email                 varchar(120) not null unique,
  estado_disponibilidad varchar(20) not null
                        check (estado_disponibilidad in ('DISPONIBLE', 'EN_VIAJE', 'FUERA_DE_TURNO')),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Lista de conductores asignables
create index conductor_asignables on public.conductor (flota_id) where is_active;

-- Cotización calculada por el motor tarifario (Tabla 133) con recargos aplicados (RN-15)
create table public.cotizacion (
  cotizacion_id      bigint generated always as identity primary key,
  flota_id           uuid not null references public.flota (flota_id) on delete restrict,
  tarifa_id          bigint not null references public.tarifa (tarifa_id) on delete restrict,
  creado_por         uuid not null default auth.uid() references auth.users (id) on delete restrict,
  destino_texto      varchar(200) not null,
  place_id           varchar(300),
  -- WGS 84; se anulan a los 30 días (RN-14, pendiente)
  destino_lat        numeric(9,6) check (destino_lat between -90 and 90),
  destino_lng        numeric(9,6) check (destino_lng between -180 and 180),
  distancia_km       numeric(6,2) not null check (distancia_km > 0),
  duracion_min       integer,
  metodo_calculo     varchar(12) not null check (metodo_calculo in ('ROUTES_API', 'HAVERSINE')),
  -- Instantánea de los recargos aplicados, p. ej. {"EQUIPAJE": 500, "NOCTURNO": 1500}
  recargos_aplicados jsonb not null default '{}'::jsonb
                     check (jsonb_typeof(recargos_aplicados) = 'object'
                            and recargos_aplicados - array['EQUIPAJE', 'MASCOTA', 'NOCTURNO'] = '{}'::jsonb),
  recargos_total     integer not null default 0 check (recargos_total >= 0),
  -- RN-06: monto congelado
  tarifa_calculada   integer not null check (tarifa_calculada >= 0),
  estado             varchar(12) not null default 'BORRADOR'
                     check (estado in ('BORRADOR', 'CONFIRMADA', 'DESCARTADA')),
  iniciada_at        timestamptz not null,
  created_at         timestamptz not null default now(),
  confirmada_at      timestamptz,
  constraint chk_destino_completo check ((destino_lat is null) = (destino_lng is null)),
  constraint chk_confirmada_at check (estado <> 'CONFIRMADA' or confirmada_at is not null)
);

-- KPI-05 y KPI-06 por mes
create index cotizacion_flota_fecha on public.cotizacion (flota_id, created_at);

-- Viaje asignado en el Calendario Maestro (Tabla 134, Anexo C)
create table public.viaje (
  viaje_id      bigint generated always as identity primary key,
  -- RN-10: una cotización origina a lo sumo un viaje
  cotizacion_id bigint not null unique references public.cotizacion (cotizacion_id) on delete restrict,
  flota_id      uuid not null references public.flota (flota_id) on delete restrict,
  driver_id     uuid not null references public.conductor (driver_id) on delete restrict,
  franja_inicio timestamptz not null,
  franja_fin    timestamptz not null,
  -- RN-06: monto congelado
  tarifa        integer not null check (tarifa >= 0),
  estado        varchar(12) not null default 'ASIGNADO'
                check (estado in ('ASIGNADO', 'ACTIVO', 'COMPLETADO', 'CANCELADO')),
  km_reales     numeric(6,2) check (km_reales > 0),
  observacion   varchar(300),
  asignado_por  uuid not null default auth.uid() references auth.users (id) on delete restrict,
  asignado_at   timestamptz not null default now(),
  completado_at timestamptz,
  constraint chk_franja check (franja_fin > franja_inicio),
  -- RN-12: un viaje completado registra km reales e instante de cierre
  constraint chk_completado check (estado <> 'COMPLETADO' or (km_reales is not null and completado_at is not null)),
  -- RN-08 / HU05: un conductor no puede tener franjas superpuestas
  constraint sin_topes exclude using gist (
    driver_id with =,
    tstzrange(franja_inicio, franja_fin, '[)') with &&
  ) where (estado <> 'CANCELADO')
);

-- Calendario del día e historial (CU10); «Mis viajes» (CU12)
create index viaje_flota_franja on public.viaje (flota_id, franja_inicio);
create index viaje_conductor_franja on public.viaje (driver_id, franja_inicio);

-- Bitácora inmutable de cambios de estado (Tabla 135); solo la escribe el trigger
create table public.viaje_evento (
  evento_id       bigint generated always as identity primary key,
  viaje_id        bigint not null references public.viaje (viaje_id) on delete restrict,
  estado_anterior varchar(12),
  estado_nuevo    varchar(12) not null,
  usuario_id      uuid not null references auth.users (id) on delete restrict,
  detalle         jsonb,
  created_at      timestamptz not null default now()
);

create index viaje_evento_viaje on public.viaje_evento (viaje_id, created_at);

-- -----------------------------------------------------------------------------
-- 2. Funciones y triggers (Tabla 47)
-- -----------------------------------------------------------------------------

-- Distancia ortodrómica en km (radio 6371): geocerca RN-02 y respaldo RN-05
create function public.fn_haversine(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision)
returns double precision
language sql immutable
set search_path = ''
as $$
  select 6371.0 * 2 * atan2(sqrt(a), sqrt(1 - a))
  from (select power(sin(radians(lat2 - lat1) / 2), 2)
             + cos(radians(lat1)) * cos(radians(lat2))
             * power(sin(radians(lng2 - lng1) / 2), 2) as a) t;
$$;

-- Mantiene conductor.updated_at
create function public.tg_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_conductor_updated_at before update on public.conductor
for each row execute function public.tg_updated_at();

-- RN-11: valida el estado en todo INSERT o UPDATE de viaje, venga de la RPC o del administrador
create function public.tg_validar_transicion_viaje() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'ASIGNADO' then
      raise exception 'Un viaje nuevo debe quedar en estado ASIGNADO';
    end if;
  else
    if new.estado is distinct from old.estado
       and not ((old.estado = 'ASIGNADO' and new.estado in ('ACTIVO', 'CANCELADO'))
             or (old.estado = 'ACTIVO' and new.estado = 'COMPLETADO')) then
      raise exception 'Transición de viaje no permitida: % → %', old.estado, new.estado;
    end if;
    -- Solo se reprograma (conductor o franja) un viaje que sigue ASIGNADO
    if old.estado <> 'ASIGNADO'
       and (new.driver_id, new.franja_inicio, new.franja_fin)
           is distinct from (old.driver_id, old.franja_inicio, old.franja_fin) then
      raise exception 'Solo se puede reprogramar un viaje en estado ASIGNADO';
    end if;
  end if;
  return new;
end $$;

create trigger trg_viaje_validar_transicion before insert or update on public.viaje
for each row execute function public.tg_validar_transicion_viaje();

-- RN-06: el monto del viaje se copia de la cotización; no depende de lo que envíe el cliente
create function public.tg_viaje_congelar_tarifa() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select tarifa_calculada into new.tarifa
  from public.cotizacion
  where cotizacion_id = new.cotizacion_id;
  return new;
end $$;

create trigger trg_viaje_congelar_tarifa before insert on public.viaje
for each row execute function public.tg_viaje_congelar_tarifa();

-- RN-13: bitácora inmutable de estados (Anexo C)
create function public.tg_viaje_evento() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.viaje_evento (viaje_id, estado_anterior, estado_nuevo, usuario_id, detalle)
    values (new.viaje_id,
            case when tg_op = 'UPDATE' then old.estado end,
            new.estado,
            coalesce(auth.uid(), new.asignado_por),
            jsonb_build_object('km_reales', new.km_reales));
  end if;
  return new;
end $$;

create trigger trg_viaje_evento after insert or update on public.viaje
for each row execute function public.tg_viaje_evento();

-- Flotas que administra el usuario de la sesión (apoyo de las políticas RLS)
create function public.fn_flotas_admin() returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select flota_id from public.flota where admin_id = auth.uid();
$$;

-- Cotizaciones de los viajes del conductor de la sesión (apoyo de la política de cotizacion)
create function public.fn_cotizaciones_conductor() returns setof bigint
language sql stable security definer
set search_path = ''
as $$
  select cotizacion_id from public.viaje where driver_id = auth.uid();
$$;

-- RPC del conductor para iniciar o completar sus propios viajes (RN-11, RN-12; CU12)
create function public.fn_cambiar_estado_viaje(
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
    -- Guarda del diagrama de estados (§3.4.1): no se inicia más de 30 min antes de la franja
    if now() < v_viaje.franja_inicio - interval '30 minutes' then
      raise exception 'El viaje solo puede iniciarse desde 30 minutos antes de su franja';
    end if;
    update public.viaje set estado = 'ACTIVO'
    where viaje_id = p_viaje_id
    returning * into v_viaje;
  elsif p_nuevo_estado = 'COMPLETADO' then
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
-- 3. Permisos (Tabla 48): anon sin acceso, nadie borra, montos congelados (RN-06)
-- -----------------------------------------------------------------------------

revoke all on public.flota, public.tarifa, public.conductor, public.cotizacion,
              public.viaje, public.viaje_evento
  from anon, authenticated;

-- El alta de flota la hace el servidor (service role)
grant select on public.flota to authenticated;
grant update (nombre, radio_max_km) on public.flota to authenticated;

grant select, insert, update on public.tarifa, public.conductor to authenticated;

-- Cotización: solo cambia de estado; viaje: reprogramar, cancelar u observar.
-- km_reales y completado_at solo se escriben mediante fn_cambiar_estado_viaje.
grant select, insert on public.cotizacion, public.viaje to authenticated;
grant update (estado, confirmada_at) on public.cotizacion to authenticated;
grant update (driver_id, franja_inicio, franja_fin, estado, observacion) on public.viaje to authenticated;

-- La bitácora solo se lee; la escribe el trigger
grant select on public.viaje_evento to authenticated;

revoke execute on function
  public.fn_haversine(double precision, double precision, double precision, double precision),
  public.fn_flotas_admin(),
  public.fn_cotizaciones_conductor(),
  public.fn_cambiar_estado_viaje(bigint, varchar, numeric)
  from public, anon;

grant execute on function
  public.fn_haversine(double precision, double precision, double precision, double precision),
  public.fn_flotas_admin(),
  public.fn_cotizaciones_conductor(),
  public.fn_cambiar_estado_viaje(bigint, varchar, numeric)
  to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (Tabla 44; HU08; CP-16 a CP-18)
-- -----------------------------------------------------------------------------

alter table public.flota        enable row level security;
alter table public.tarifa       enable row level security;
alter table public.conductor    enable row level security;
alter table public.cotizacion   enable row level security;
alter table public.viaje        enable row level security;
alter table public.viaje_evento enable row level security;

-- flota: el administrador ve y edita solo la suya
create policy admin_lee_su_flota on public.flota
  for select to authenticated
  using (admin_id = (select auth.uid()));

create policy admin_actualiza_su_flota on public.flota
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));

-- tarifa: el administrador gestiona las de su flota
create policy admin_lee_tarifas on public.tarifa
  for select to authenticated
  using (flota_id in (select public.fn_flotas_admin()));

create policy admin_crea_tarifas on public.tarifa
  for insert to authenticated
  with check (flota_id in (select public.fn_flotas_admin()));

create policy admin_actualiza_tarifas on public.tarifa
  for update to authenticated
  using (flota_id in (select public.fn_flotas_admin()))
  with check (flota_id in (select public.fn_flotas_admin()));

-- conductor: el administrador gestiona su flota; el conductor lee su propio perfil
create policy admin_lee_conductores on public.conductor
  for select to authenticated
  using (flota_id in (select public.fn_flotas_admin()));

create policy admin_crea_conductores on public.conductor
  for insert to authenticated
  with check (flota_id in (select public.fn_flotas_admin()));

create policy admin_actualiza_conductores on public.conductor
  for update to authenticated
  using (flota_id in (select public.fn_flotas_admin()))
  with check (flota_id in (select public.fn_flotas_admin()));

create policy conductor_lee_su_perfil on public.conductor
  for select to authenticated
  using (driver_id = (select auth.uid()));

-- cotizacion: solo el administrador de la flota
create policy admin_lee_cotizaciones on public.cotizacion
  for select to authenticated
  using (flota_id in (select public.fn_flotas_admin()));

create policy admin_crea_cotizaciones on public.cotizacion
  for insert to authenticated
  with check (flota_id in (select public.fn_flotas_admin())
              and creado_por = (select auth.uid()));

create policy admin_actualiza_cotizaciones on public.cotizacion
  for update to authenticated
  using (flota_id in (select public.fn_flotas_admin()))
  with check (flota_id in (select public.fn_flotas_admin()));

-- El conductor lee la cotización de sus viajes para ver el destino en «Mis viajes» (CU12).
-- Usa fn_cotizaciones_conductor (security definer): una subconsulta directa sobre viaje
-- causa recursión (42P17), porque la política de INSERT de viaje ya consulta cotizacion.
create policy conductor_lee_cotizacion_de_sus_viajes on public.cotizacion
  for select to authenticated
  using (cotizacion_id in (select public.fn_cotizaciones_conductor()));

-- viaje: el administrador opera su flota; el conductor solo lee los suyos
-- (sin DELETE: Tabla 48; el Anexo C usa «for all», que lo permitiría)
create policy admin_lee_viajes on public.viaje
  for select to authenticated
  using (flota_id in (select public.fn_flotas_admin()));

create policy admin_asigna_viajes on public.viaje
  for insert to authenticated
  with check (
    flota_id in (select public.fn_flotas_admin())
    and asignado_por = (select auth.uid())
    -- RN-09: solo conductores activos de la misma flota
    and exists (select 1 from public.conductor c
                where c.driver_id = viaje.driver_id
                  and c.flota_id = viaje.flota_id
                  and c.is_active)
    -- CU05 → CU08: la cotización es de la misma flota y está confirmada
    and exists (select 1 from public.cotizacion q
                where q.cotizacion_id = viaje.cotizacion_id
                  and q.flota_id = viaje.flota_id
                  and q.estado = 'CONFIRMADA')
  );

create policy admin_actualiza_viajes on public.viaje
  for update to authenticated
  using (flota_id in (select public.fn_flotas_admin()))
  with check (
    flota_id in (select public.fn_flotas_admin())
    -- Al reprogramar, el conductor debe seguir siendo de la flota
    and exists (select 1 from public.conductor c
                where c.driver_id = viaje.driver_id
                  and c.flota_id = viaje.flota_id)
  );

create policy conductor_lee_sus_viajes on public.viaje
  for select to authenticated
  using (driver_id = (select auth.uid()));

-- viaje_evento: solo lectura para el administrador de la flota
create policy admin_lee_bitacora on public.viaje_evento
  for select to authenticated
  using (exists (select 1 from public.viaje v
                 where v.viaje_id = viaje_evento.viaje_id
                   and v.flota_id in (select public.fn_flotas_admin())));

commit;
