-- Control de obra: certificaciones y costes por obra y mes de imputación.
-- Especificación: referencia/IMTEX_control_obra.html y docs/PLAN.md B4.
-- En todas las tablas, `mes` es el día 1 del mes al que se imputa el apunte (puede no coincidir con la fecha).
-- Una obra con apuntes no se puede borrar (sin `on delete cascade`): así no se pierden costes por error.

create table public.certificaciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras,
  numero integer not null check (numero > 0),
  mes date not null check (mes = date_trunc('month', mes)),
  fecha_corte date,
  descripcion text,
  -- Acumulado desde el inicio de la obra. Lo certificado en el mes es la diferencia con la anterior.
  importe_origen numeric(12,2) not null check (importe_origen >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (obra_id, numero)
);

-- Los precios por hora se copian de la categoría al guardar el parte, como hace la herramienta.
create table public.partes_horas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras,
  fecha date not null,
  mes date not null check (mes = date_trunc('month', mes)),
  trabajador_id uuid references public.trabajadores on delete set null,
  operario text not null, -- nombre del trabajador, o texto libre («Equipo de estructura (4 op.)»)
  categoria_id uuid references public.categorias_profesionales on delete set null,
  horas_ord numeric(8,2) not null default 0 check (horas_ord >= 0),
  precio_ord numeric(12,4) not null default 0,
  horas_ext numeric(8,2) not null default 0 check (horas_ext >= 0),
  precio_ext numeric(12,4) not null default 0,
  dietas numeric(12,2) not null default 0,
  alojamiento numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table public.materiales (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras,
  fecha date not null,
  mes date not null check (mes = date_trunc('month', mes)),
  proveedor text,
  tipo text,
  documento text,
  concepto text,
  importe numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- La retención no cambia el coste de la obra: solo el líquido a pagar a la subcontrata.
create table public.subcontratas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras,
  fecha date not null,
  mes date not null check (mes = date_trunc('month', mes)),
  empresa text,
  documento text,
  concepto text,
  importe numeric(12,2) not null,
  retencion_pct numeric(5,2) not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table public.alquileres (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras,
  fecha date not null,
  mes date not null check (mes = date_trunc('month', mes)),
  empresa text,
  documento text,
  concepto text,
  importe numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- Furgón y camión: km × tarifa por km. Maquinaria: importe directo.
create table public.combustible (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras,
  fecha date not null,
  mes date not null check (mes = date_trunc('month', mes)),
  tipo_vehiculo text not null check (tipo_vehiculo in ('furgon', 'camion', 'maquinaria')),
  vehiculo text,
  km numeric(10,2) not null default 0,
  tarifa_km numeric(12,4) not null default 0,
  importe numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- Dietas y hoteles con ticket o factura (los de los partes van en partes_horas)
create table public.gastos_viaje (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras,
  fecha date not null,
  mes date not null check (mes = date_trunc('month', mes)),
  tipo text not null check (tipo in ('dietas', 'hoteles')),
  tercero text,
  documento text,
  concepto text,
  importe numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- Los partes de horas los meten el encargado y administración; el operario no entra en esta fase.
delete from public.permisos_rol where rol = 'operario' and modulo = 'partes_horas';

-- Índice, updated_at y RLS: lo mismo en las siete tablas ---------------------------------

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('certificaciones', 'certificaciones'),
      ('partes_horas', 'partes_horas'),
      ('materiales', 'control_obra'),
      ('subcontratas', 'control_obra'),
      ('alquileres', 'control_obra'),
      ('combustible', 'control_obra'),
      ('gastos_viaje', 'control_obra')
    ) as v(tabla, modulo)
  loop
    execute format('create index on public.%I (obra_id, mes)', t.tabla);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t.tabla);
    execute format('alter table public.%I enable row level security', t.tabla);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.tiene_permiso(%L, ''ver'')))',
      t.tabla || '_ver', t.tabla, t.modulo);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.tiene_permiso(%L, ''editar'')))',
      t.tabla || '_insertar', t.tabla, t.modulo);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.tiene_permiso(%L, ''editar''))) with check ((select private.tiene_permiso(%L, ''editar'')))',
      t.tabla || '_editar', t.tabla, t.modulo, t.modulo);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.tiene_permiso(%L, ''editar'')))',
      t.tabla || '_borrar', t.tabla, t.modulo);
  end loop;
end;
$$;

create index on public.partes_horas (trabajador_id);
create index on public.partes_horas (categoria_id);

-- Sumas por obra y mes (regla 7: en SQL) -----------------------------------------------
-- Son las entradas de crm/src/lib/calculos/control-obra.ts, que calcula estructura,
-- resultado, margen y acumulados igual que getMonthConsolidated de la herramienta.

create view public.control_obra_mensual with (security_invoker = true) as
with apuntes as (
  select obra_id, mes, 'certificacion' as concepto,
    importe_origen - coalesce(lag(importe_origen) over (partition by obra_id order by numero), 0) as importe
  from public.certificaciones
  union all
  select obra_id, mes, 'personal', horas_ord * precio_ord + horas_ext * precio_ext from public.partes_horas
  union all
  select obra_id, mes, 'dietas', dietas from public.partes_horas
  union all
  select obra_id, mes, 'hoteles', alojamiento from public.partes_horas
  union all
  select obra_id, mes, 'materiales', importe from public.materiales
  union all
  select obra_id, mes, 'subcontrata', importe from public.subcontratas
  union all
  select obra_id, mes, 'alquileres', importe from public.alquileres
  union all
  select obra_id, mes, 'combustible', importe from public.combustible
  union all
  select obra_id, mes, tipo, importe from public.gastos_viaje
)
select obra_id, mes,
  coalesce(sum(importe) filter (where concepto = 'certificacion'), 0) as certificacion,
  coalesce(sum(importe) filter (where concepto = 'personal'), 0) as personal,
  coalesce(sum(importe) filter (where concepto = 'subcontrata'), 0) as subcontrata,
  coalesce(sum(importe) filter (where concepto = 'materiales'), 0) as materiales,
  coalesce(sum(importe) filter (where concepto = 'alquileres'), 0) as alquileres,
  coalesce(sum(importe) filter (where concepto = 'combustible'), 0) as combustible,
  coalesce(sum(importe) filter (where concepto = 'dietas'), 0) as dietas,
  coalesce(sum(importe) filter (where concepto = 'hoteles'), 0) as hoteles
from apuntes
group by obra_id, mes;

-- Coste presupuestado por familia de precios, para comparar con lo real.
-- Las líneas de precio libre no tienen familia.
create view public.presupuesto_costes_familia with (security_invoker = true) as
select pp.presupuesto_id,
  coalesce(pr.familia, 'sin_clasificar') as familia,
  sum(l.rendimiento * l.coste_unitario * pp.cantidad) as coste
from public.presupuesto_lineas l
join public.presupuesto_partidas pp on pp.id = l.partida_id
left join public.precios pr on pr.id = l.precio_id
group by pp.presupuesto_id, coalesce(pr.familia, 'sin_clasificar');
