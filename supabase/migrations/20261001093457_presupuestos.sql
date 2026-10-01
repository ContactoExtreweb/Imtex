-- Presupuestos: base de precios, partidas tipo, presupuestos con partidas y líneas.
-- Especificación: referencia/IMTEX_plantilla_presupuestos.html y docs/PLAN.md B4.

-- Base de precios ------------------------------------------------------------

create table public.precios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  familia text not null
    check (familia in ('mano_obra', 'subcontrata', 'vehiculos', 'maquinaria', 'materiales')),
  descripcion text not null,
  fabricante text,
  unidad text not null default 'ud',
  coste numeric(12,4) not null default 0 check (coste >= 0),
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- Partidas tipo (plantillas) -------------------------------------------------

create table public.partidas_tipo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null default '',
  medicion text not null default '',
  cantidad numeric(12,4) not null default 1 check (cantidad > 0),
  gg_pct numeric(5,2) not null default 16,
  ben_pct numeric(5,2) not null default 35,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- Línea de la base (precio_id: se lee el precio vigente) o precio libre (descripción, unidad y coste).
-- Un precio usado en una partida tipo no se puede borrar: se desactiva.
create table public.partidas_tipo_lineas (
  id uuid primary key default gen_random_uuid(),
  partida_tipo_id uuid not null references public.partidas_tipo on delete cascade,
  orden integer not null default 0,
  precio_id uuid references public.precios,
  descripcion text,
  unidad text,
  coste_unitario numeric(12,4),
  rendimiento numeric(14,6) not null default 1,
  check (precio_id is not null or (descripcion is not null and coste_unitario is not null))
);
create index on public.partidas_tipo_lineas (partida_tipo_id);
create index on public.partidas_tipo_lineas (precio_id);

-- Presupuestos -----------------------------------------------------------------

-- Los porcentajes por defecto son los de la plantilla de IMTEX (16 % GG, 35 % beneficio).
create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  titulo text not null default '',
  cliente_id uuid references public.clientes,
  contacto text,
  localidad text,
  fecha date not null default current_date,
  validez text,
  forma_pago text,
  plazo text,
  iva_pct numeric(5,2) not null default 21,
  gg_pct_def numeric(5,2) not null default 16,
  ben_pct_def numeric(5,2) not null default 35,
  carta text not null default '',
  condiciones text not null default '',
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviado', 'aceptado', 'rechazado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.presupuestos (cliente_id);

create table public.presupuesto_partidas (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos on delete cascade,
  orden integer not null default 0,
  codigo text not null default '',
  titulo text not null default '',
  medicion text not null default '',
  cantidad numeric(12,4) not null default 1 check (cantidad > 0),
  gg_pct numeric(5,2) not null default 16,
  ben_pct numeric(5,2) not null default 35
);
create index on public.presupuesto_partidas (presupuesto_id);

-- El coste (y el código, la descripción y la unidad) se copian al añadir la línea:
-- un cambio en la base de precios no altera presupuestos ya hechos.
create table public.presupuesto_lineas (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.presupuesto_partidas on delete cascade,
  orden integer not null default 0,
  precio_id uuid references public.precios on delete set null,
  codigo text,
  descripcion text not null,
  unidad text,
  coste_unitario numeric(12,4) not null default 0,
  rendimiento numeric(14,6) not null default 1
);
create index on public.presupuesto_lineas (partida_id);
create index on public.presupuesto_lineas (precio_id);

-- Obra creada a partir de un presupuesto aceptado (una por presupuesto)
alter table public.obras
  add column presupuesto_id uuid unique references public.presupuestos on delete set null;

create trigger set_updated_at before update on public.precios
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.partidas_tipo
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.presupuestos
  for each row execute function public.set_updated_at();

-- Totales ------------------------------------------------------------------------
-- Mismas fórmulas que crm/src/lib/calculos/presupuesto.ts (partidaCostes y sumaResumen):
-- importe de la partida = coste directo × (1 + GG) × (1 + beneficio).

create view public.presupuestos_totales with (security_invoker = true) as
with partidas as (
  select pp.presupuesto_id, pp.cantidad, pp.gg_pct, pp.ben_pct,
    coalesce((
      select sum(l.rendimiento * l.coste_unitario)
      from public.presupuesto_lineas l
      where l.partida_id = pp.id
    ), 0) as coste
  from public.presupuesto_partidas pp
),
bases as (
  select p.id as presupuesto_id, p.iva_pct,
    coalesce(sum(x.coste * x.cantidad), 0) as coste_directo,
    coalesce(sum(x.coste * (1 + x.gg_pct / 100) * (1 + x.ben_pct / 100) * x.cantidad), 0) as base
  from public.presupuestos p
  left join partidas x on x.presupuesto_id = p.id
  group by p.id
)
select presupuesto_id, coste_directo, base,
  base * iva_pct / 100 as iva,
  base * (1 + iva_pct / 100) as total
from bases;

-- Guardado en una transacción ------------------------------------------------------
-- Cabecera, partidas y líneas de una vez: un fallo a medias no deja el presupuesto sin partidas.
-- Security invoker: se aplica el RLS de quien llama. Solo se guardan borradores.

create function public.guardar_presupuesto(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (p ->> 'id')::uuid;
  v_partida jsonb;
  v_orden bigint;
  v_partida_id uuid;
begin
  if v_id is null then
    insert into public.presupuestos (codigo, titulo, cliente_id, contacto, localidad, fecha, validez,
      forma_pago, plazo, iva_pct, gg_pct_def, ben_pct_def, carta, condiciones)
    values (p ->> 'codigo', coalesce(p ->> 'titulo', ''), (p ->> 'cliente_id')::uuid, p ->> 'contacto',
      p ->> 'localidad', (p ->> 'fecha')::date, p ->> 'validez', p ->> 'forma_pago', p ->> 'plazo',
      (p ->> 'iva_pct')::numeric, (p ->> 'gg_pct_def')::numeric, (p ->> 'ben_pct_def')::numeric,
      coalesce(p ->> 'carta', ''), coalesce(p ->> 'condiciones', ''))
    returning id into v_id;
  else
    update public.presupuestos set
      codigo = p ->> 'codigo',
      titulo = coalesce(p ->> 'titulo', ''),
      cliente_id = (p ->> 'cliente_id')::uuid,
      contacto = p ->> 'contacto',
      localidad = p ->> 'localidad',
      fecha = (p ->> 'fecha')::date,
      validez = p ->> 'validez',
      forma_pago = p ->> 'forma_pago',
      plazo = p ->> 'plazo',
      iva_pct = (p ->> 'iva_pct')::numeric,
      gg_pct_def = (p ->> 'gg_pct_def')::numeric,
      ben_pct_def = (p ->> 'ben_pct_def')::numeric,
      carta = coalesce(p ->> 'carta', ''),
      condiciones = coalesce(p ->> 'condiciones', '')
    where id = v_id and estado = 'borrador';
    if not found then
      raise exception 'El presupuesto no existe, no es un borrador o no tienes permiso para editarlo'
        using errcode = '42501';
    end if;
    delete from public.presupuesto_partidas where presupuesto_id = v_id;
  end if;

  for v_partida, v_orden in
    select t.value, t.ordinality
    from jsonb_array_elements(coalesce(p -> 'partidas', '[]'::jsonb)) with ordinality as t
  loop
    insert into public.presupuesto_partidas (presupuesto_id, orden, codigo, titulo, medicion, cantidad, gg_pct, ben_pct)
    values (v_id, v_orden, coalesce(v_partida ->> 'codigo', ''), coalesce(v_partida ->> 'titulo', ''),
      coalesce(v_partida ->> 'medicion', ''), (v_partida ->> 'cantidad')::numeric,
      (v_partida ->> 'gg_pct')::numeric, (v_partida ->> 'ben_pct')::numeric)
    returning id into v_partida_id;

    insert into public.presupuesto_lineas (partida_id, orden, precio_id, codigo, descripcion, unidad, coste_unitario, rendimiento)
    select v_partida_id, t.ordinality, (t.value ->> 'precio_id')::uuid, t.value ->> 'codigo',
      t.value ->> 'descripcion', t.value ->> 'unidad',
      (t.value ->> 'coste_unitario')::numeric, (t.value ->> 'rendimiento')::numeric
    from jsonb_array_elements(coalesce(v_partida -> 'lineas', '[]'::jsonb)) with ordinality as t;
  end loop;

  return v_id;
end;
$$;

create function public.guardar_partida_tipo(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (p ->> 'id')::uuid;
begin
  if v_id is null then
    insert into public.partidas_tipo (codigo, titulo, medicion, cantidad, gg_pct, ben_pct)
    values (p ->> 'codigo', coalesce(p ->> 'titulo', ''), coalesce(p ->> 'medicion', ''),
      (p ->> 'cantidad')::numeric, (p ->> 'gg_pct')::numeric, (p ->> 'ben_pct')::numeric)
    returning id into v_id;
  else
    update public.partidas_tipo set
      codigo = p ->> 'codigo',
      titulo = coalesce(p ->> 'titulo', ''),
      medicion = coalesce(p ->> 'medicion', ''),
      cantidad = (p ->> 'cantidad')::numeric,
      gg_pct = (p ->> 'gg_pct')::numeric,
      ben_pct = (p ->> 'ben_pct')::numeric
    where id = v_id;
    if not found then
      raise exception 'La partida tipo no existe o no tienes permiso para editarla' using errcode = '42501';
    end if;
    delete from public.partidas_tipo_lineas where partida_tipo_id = v_id;
  end if;

  insert into public.partidas_tipo_lineas (partida_tipo_id, orden, precio_id, descripcion, unidad, coste_unitario, rendimiento)
  select v_id, t.ordinality, (t.value ->> 'precio_id')::uuid, t.value ->> 'descripcion', t.value ->> 'unidad',
    (t.value ->> 'coste_unitario')::numeric, (t.value ->> 'rendimiento')::numeric
  from jsonb_array_elements(coalesce(p -> 'lineas', '[]'::jsonb)) with ordinality as t;

  return v_id;
end;
$$;

revoke execute on function public.guardar_presupuesto(jsonb) from public, anon;
revoke execute on function public.guardar_partida_tipo(jsonb) from public, anon;
grant execute on function public.guardar_presupuesto(jsonb) to authenticated;
grant execute on function public.guardar_partida_tipo(jsonb) to authenticated;

-- RLS ------------------------------------------------------------------------------
-- Mismo patrón que la migración nucleo: una política de lectura y tres de escritura por tabla.
-- La base de precios la leen también quienes ven presupuestos (hace falta para montarlos).

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('precios', 'base_precios', true),
      ('partidas_tipo', 'base_precios', true),
      ('partidas_tipo_lineas', 'base_precios', true),
      ('presupuestos', 'presupuestos', false),
      ('presupuesto_partidas', 'presupuestos', false),
      ('presupuesto_lineas', 'presupuestos', false)
    ) as v(tabla, modulo, lectura_presupuestos)
  loop
    execute format('alter table public.%I enable row level security', t.tabla);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.tiene_permiso(%L, ''ver''))%s)',
      t.tabla || '_ver', t.tabla, t.modulo,
      case when t.lectura_presupuestos
        then ' or (select private.tiene_permiso(''presupuestos'', ''ver''))' else '' end);
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

-- Base de precios de partida: los 90 precios de la plantilla de IMTEX (sin las 30 filas vacías) ---------

insert into public.precios (codigo, familia, descripcion, fabricante, unidad, coste, notas) values
  ('MO01', 'mano_obra', 'Operario IMTEX <150 km', null, 'h', 17.5, null),
  ('MO02', 'mano_obra', 'Operario IMTEX >150 km', null, 'ud', 25, null),
  ('VE01', 'vehiculos', 'Furgón IMTEX', null, 'km', 0.18, null),
  ('VE02', 'vehiculos', 'Camión IMTEX', null, 'km', 0.32, null),
  ('MAQ01', 'maquinaria', 'Bomba Mortero 380 + pp recambios', null, 'dia', 120, null),
  ('MAQ02', 'maquinaria', 'Bomba Mortero 220 + pp recambios', null, 'dia', 100, null),
  ('MAQ03', 'maquinaria', 'Putzmaister Sprayboy + pp recambios', null, 'dia', 120, null),
  ('MAQ04', 'maquinaria', 'Máquina Poliurea + pp recambios', null, 'dia', 150, null),
  ('MAQ05', 'maquinaria', 'Lijadora 220 + pp lijas', null, 'dia', 60, null),
  ('MAQ06', 'maquinaria', 'Diamantadora 380 + pp muelas', null, 'dia', 150, null),
  ('MAQ07', 'maquinaria', 'Desbastadora manual + aspiradora', null, 'dia', 20, null),
  ('MAQ08', 'maquinaria', 'Hidrolimpiadora 150 atm', null, 'dia', 35, null),
  ('MAQ09', 'maquinaria', 'Hidrolimpiadora 300 atm', null, 'dia', 65, null),
  ('MAQ10', 'maquinaria', 'Hidrolimpiadora 500 atm', null, 'dia', 125, null),
  ('MAQ11', 'maquinaria', 'Grupo electrógeno 220 7 Kva + gasolina', null, 'dia', 50, null),
  ('MAQ12', 'maquinaria', 'Grupo electrógeno 380 20 Kva + gasoil', null, 'dia', 65, null),
  ('MAQ13', 'maquinaria', 'Compresor aire 7 m3 + gasoil', null, 'dia', 80, null),
  ('DZ01', 'materiales', 'MAXELASTIC POLY', 'DRIZORO', 'kg', 5.5, 'SET 450 KG'),
  ('DZ02', 'materiales', 'MAXELASTIC POLY H', 'DRIZORO', 'kg', 5.15, 'SET 450 KG'),
  ('DZ03', 'materiales', 'MAXELASTIC POLY M', 'DRIZORO', 'kg', 7.88, 'SET 20 KG'),
  ('DZ04', 'materiales', 'DRIZORO WRAP 300', 'DRIZORO', 'm2', 27, 'ROLLO 100/50 X 0,30 M'),
  ('DZ05', 'materiales', 'DRIZORO WRAP 200', 'DRIZORO', 'm2', 23.64, 'ROLLO 100/50 X 0,20 M'),
  ('DZ06', 'materiales', 'DRIZORO COMPOSITE 1405', 'DRIZORO', 'ml', 11.95, 'ROLLO 100 ML'),
  ('DZ07', 'materiales', 'DRIZORO COMPOSITE 1408', 'DRIZORO', 'ml', 16.9, 'ROLLO 50 ML'),
  ('DZ08', 'materiales', 'DRIZORO COMPOSITE 1410', 'DRIZORO', 'ml', 19.99, 'ROLLO 50 ML'),
  ('DZ09', 'materiales', 'DRIZORO COMPOSITE 1412', 'DRIZORO', 'ml', 22.4, 'ROLLO 50 ML'),
  ('DZ10', 'materiales', 'MAXPRIMER C', 'DRIZORO', 'kg', 23.07, 'SET 15 KG'),
  ('DZ11', 'materiales', 'MAXEPOX CS', 'DRIZORO', 'kg', 23.07, 'SET 15 KG'),
  ('DZ12', 'materiales', 'MAXEPOX CARBOFIX', 'DRIZORO', 'kg', 8.65, 'SET 5 KG'),
  ('DZ13', 'materiales', 'MAXSEAL FLEX RUGOSO GRIS', 'DRIZORO', 'kg', 1.81, 'SET 35 KG'),
  ('DZ14', 'materiales', 'MAXSEAL FLEX M', 'DRIZORO', 'kg', 1.91, 'SACO 22 KG'),
  ('DZ15', 'materiales', 'MAXPLUG', 'DRIZORO', 'kg', 1.65, 'BIDÓN 25 KG'),
  ('DZ16', 'materiales', 'MAXURETHANE FLEX', 'DRIZORO', 'kg', 9.16, 'SET 25 KG RAL ESTANDAR'),
  ('DZ17', 'materiales', 'MAXELASTIC PUR', 'DRIZORO', 'kg', 4.5, 'SET 25 KG RAL ESTANDAR'),
  ('DZ18', 'materiales', 'MAXELASTIC PUR E', 'DRIZORO', 'kg', 14.23, 'SET 20 KG'),
  ('DZ19', 'materiales', 'MAXEPOX PRIMER W', 'DRIZORO', 'kg', 5.02, 'SET 20 KG'),
  ('DZ20', 'materiales', 'MAXELASTIC PUR HW', 'DRIZORO', 'kg', 4.22, 'SET 25 KG RAL ESTANDAR'),
  ('DZ21', 'materiales', 'MAXRITE HT', 'DRIZORO', 'kg', 0.39, 'SACO 25 KG'),
  ('DZ22', 'materiales', 'MAXREST', 'DRIZORO', 'kg', 0.71, 'SACO 25 KG'),
  ('DZ23', 'materiales', 'MAXRITE F', 'DRIZORO', 'kg', 0.36, 'SACO 25 KG'),
  ('DZ24', 'materiales', 'MAXGROUT', 'DRIZORO', 'kg', 0.32, 'SACO 25 KG'),
  ('DZ25', 'materiales', 'MAXGROUT INJECTION', 'DRIZORO', 'kg', 0.48, 'SACO 25 KG'),
  ('DZ26', 'materiales', 'MAXRITE INHIBITOR', 'DRIZORO', 'lt', 5.11, 'GARRAFA 25 LT'),
  ('DZ27', 'materiales', 'MAXFIX V', 'DRIZORO', 'ud', 12.83, 'CARTUCHO 410 ML'),
  ('DZ28', 'materiales', 'MAXROAD', 'DRIZORO', 'kg', 0.72, 'SACO 25 KG'),
  ('DZ29', 'materiales', 'MAXEPOX FLOOR', 'DRIZORO', 'kg', 6.58, 'SET 25 KG RAL ESTANDAR'),
  ('DZ30', 'materiales', 'MAXURETHANE FLOOR', 'DRIZORO', 'kg', 7.2, 'SET 25 KG RAL ESTANDAR'),
  ('DZ31', 'materiales', 'MAXURETHANE 2C', 'DRIZORO', 'kg', 8.32, 'SET 10 KG RAL ESTANDAR'),
  ('DZ32', 'materiales', 'MAXJOINT W SEAL H 2010', 'DRIZORO', 'ml', 4.92, 'BOBINA 25 KG'),
  ('DZ33', 'materiales', 'MAXJOINT W SEAL H 2005', 'DRIZORO', 'ml', 2.46, 'BOBINA 25 KG'),
  ('DZ34', 'materiales', 'MAXURETHANE INJECTION MONO', 'DRIZORO', 'kg', 9.73, 'BIDÓN 25 KG'),
  ('DZ35', 'materiales', 'MAXRITE PASSIVE', 'DRIZORO', 'kg', 0.88, 'SACO 22 KG'),
  ('DZ36', 'materiales', 'MAXCLEAR TOP', 'DRIZORO', 'kg', 7.3, 'BIDÓN 25 KG'),
  ('SO01', 'materiales', 'MORTERPLAS SBS FV 3 KG', 'SOPREMA', 'm2', 2.65, 'ROLLO 10 M2'),
  ('SO02', 'materiales', 'MORTERPLAS SBS FV 4 KG', 'SOPREMA', 'm2', 3.39, 'ROLLO 10 M2'),
  ('SO03', 'materiales', 'MORTERPLAS SBS FM 3 KG', 'SOPREMA', 'm2', 3.16, 'ROLLO 10 M2'),
  ('SO04', 'materiales', 'MORTERPLAS SBS FP 4 KG', 'SOPREMA', 'm2', 3.94, 'ROLLO 10 M2'),
  ('SO05', 'materiales', 'MORTERPLAS SBS FP 4,80 KG', 'SOPREMA', 'm2', 4.5, 'ROLLO 10 M2'),
  ('SO06', 'materiales', 'MORTERPLAS SBS FPV 4 KG MIN GRIS', 'SOPREMA', 'm2', 4.05, 'ROLLO 10 M2'),
  ('SO07', 'materiales', 'MORTERPLAS SBS FPV 5 KG MIN GRIS', 'SOPREMA', 'm2', 4.63, 'ROLLO 8 M2'),
  ('SO08', 'materiales', 'MORTERPLAS SBS GARDEN MIN', 'SOPREMA', 'm2', 5.41, 'ROLLO 8 M2'),
  ('SO09', 'materiales', 'MORTERPLAS APP FV 3KG', 'SOPREMA', 'm2', 2.34, 'ROLLO 10 M2'),
  ('SO10', 'materiales', 'MORTERPLAS APP FV 4 KG', 'SOPREMA', 'm2', 2.97, 'ROLLO 10 M2'),
  ('SO11', 'materiales', 'MORTERPLAS APP FP 3 KG', 'SOPREMA', 'm2', 2.87, 'ROLLO 10 M2'),
  ('SO12', 'materiales', 'MORTERPLAS APP FP 4 KG', 'SOPREMA', 'm2', 3.46, 'ROLLO 10 M2'),
  ('SO13', 'materiales', 'MORTERPLAS APP FP 4,80 KG', 'SOPREMA', 'm2', 3.86, 'ROLLO 10 M2'),
  ('SO14', 'materiales', 'MORTERPLAS APP FPV 4 KG MIN GRIS', 'SOPREMA', 'm2', 3.44, 'ROLLO 10 M2'),
  ('SO15', 'materiales', 'MORTERPLAS APP FPV 5 KG MIN GRIS', 'SOPREMA', 'm2', 4.04, 'ROLLO 8 M2'),
  ('SO16', 'materiales', 'MORTERPLAS APP GARDEN MIN', 'SOPREMA', 'm2', 4.16, 'ROLLO 8 M2'),
  ('SO17', 'materiales', 'EMUFAL PRIMER', 'SOPREMA', 'kg', 1.62, 'LATA 24 KG'),
  ('SO18', 'materiales', 'TEXTOP', 'SOPREMA', 'kg', 8.35, 'LATA 15 KG'),
  ('SO19', 'materiales', 'CAZOLETA EPDM NORMAL PM', 'SOPREMA', 'ud', 11, 'PRECIO MEDIO DE 50-125 MM'),
  ('SO20', 'materiales', 'CAZOLETA EPDM SIFONICA PM', 'SOPREMA', 'ud', 18.5, 'PRECIO MEDIO'),
  ('SO21', 'materiales', 'GARGOLA EPDM', 'SOPREMA', 'ud', 11.47, '90MM LARGO 425 MM'),
  ('SO22', 'materiales', 'PLETINA GALVANIZADA 7 CMS', 'SOPREMA', 'ml', 3.23, 'PAQUETE 25X2= 50 ML'),
  ('SO23', 'materiales', 'IMPERBAND BITUMEN ALUMINIO 100 MM', 'SOPREMA', 'rollo', 9.17, 'ROLLO 10 ML'),
  ('SO24', 'materiales', 'IMPERBAND BITUMEN ALUMINIO 150 MM', 'SOPREMA', 'rollo', 13.92, 'ROLLO 10 ML'),
  ('SO25', 'materiales', 'IMPERBAND BITUMEN ALUMINIO 300 MM', 'SOPREMA', 'rollo', 25.36, 'ROLLO 10 ML'),
  ('SO26', 'materiales', 'IMPERBAND BUTILO ALUMINIO 100 MM', 'SOPREMA', 'rollo', 8.71, 'ROLLO 10 ML'),
  ('SO27', 'materiales', 'IMPERBAND BUTILO ALUMINIO 150 MM', 'SOPREMA', 'rollo', 12.5, 'ROLLO 10 ML'),
  ('SO28', 'materiales', 'IMPERBAND BUTILO ALUMINIO 300 MM', 'SOPREMA', 'rollo', 23.43, 'ROLLO 10 ML'),
  ('SO29', 'materiales', 'FLAGON SR 1.20', 'SOPREMA', 'm2', 5.42, 'ROLLO 42 M2'),
  ('SO30', 'materiales', 'FLAGON SV 1.20', 'SOPREMA', 'm2', 4.55, 'ROLLO 42 M2'),
  ('SO31', 'materiales', 'FLAGON AT 1,50', 'SOPREMA', 'm2', 10.88, 'ROLLO 42 M2'),
  ('SO32', 'materiales', 'FLAGON AT 1,20', 'SOPREMA', 'm2', 8.73, 'ROLLO 42 M2'),
  ('SO33', 'materiales', 'ESQUINERAS / RINCONERAS PVC', 'SOPREMA', 'ud', 1.12, 'CAJAS 20 UD'),
  ('SO34', 'materiales', 'GORROS PVC PM', 'SOPREMA', 'ud', 8, 'PRECIO MEDIO'),
  ('SO35', 'materiales', 'GARGOLA LATERAL PVC 110 MM', 'SOPREMA', 'ud', 21.35, null),
  ('SO36', 'materiales', 'GARGOLA LATERAL CUDRADA PVC 65-100 MM', 'SOPREMA', 'ud', 13.35, 'PRECIO MEDIO'),
  ('SO37', 'materiales', 'PLETINA COLAMINADA 2 METROS', 'SOPREMA', 'ml', 1.83, 'PAQUETE 20 ML');
