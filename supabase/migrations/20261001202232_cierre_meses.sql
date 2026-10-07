-- Cierre de meses por obra: lo que ya se ha presentado a gerencia no cambia después.
-- El bloqueo va aquí, en la base de datos, no solo en la pantalla.

create table public.meses_cerrados (
  obra_id uuid not null references public.obras on delete cascade,
  mes date not null check (mes = date_trunc('month', mes)),
  cerrado_por uuid default auth.uid(),
  cerrado_el timestamptz not null default now(),
  primary key (obra_id, mes)
);

-- Solo gerencia cierra y reabre. El estado lo ve quien ve el control de obra.
insert into public.permisos_rol (rol, modulo, puede_ver, puede_editar)
values ('gerencia', 'cierre_meses', true, true);

alter table public.meses_cerrados enable row level security;

create policy meses_cerrados_ver on public.meses_cerrados
  for select to authenticated
  using ((select private.tiene_permiso('control_obra', 'ver')) or (select private.tiene_permiso('cierre_meses', 'ver')));
create policy meses_cerrados_cerrar on public.meses_cerrados
  for insert to authenticated
  with check ((select private.tiene_permiso('cierre_meses', 'editar')));
create policy meses_cerrados_reabrir on public.meses_cerrados
  for delete to authenticated
  using ((select private.tiene_permiso('cierre_meses', 'editar')));

-- Apuntes: ni altas, ni cambios, ni borrados en un mes cerrado --------------------------
-- Security definer: el bloqueo no depende de que quien escribe pueda leer meses_cerrados.

create function private.proteger_mes_cerrado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date;
begin
  -- Ni la fila que había (cambio o borrado) ni la que queda (alta o cambio) pueden caer en un mes cerrado:
  -- así tampoco se mueve un apunte a un mes cerrado ni se saca de él.
  if tg_op <> 'INSERT' then
    select c.mes into v_mes from public.meses_cerrados c where c.obra_id = old.obra_id and c.mes = old.mes;
  end if;
  if v_mes is null and tg_op <> 'DELETE' then
    select c.mes into v_mes from public.meses_cerrados c where c.obra_id = new.obra_id and c.mes = new.mes;
  end if;
  if v_mes is not null then
    raise exception 'El mes % de % está cerrado en esta obra. Gerencia puede reabrirlo.',
      (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
             'octubre', 'noviembre', 'diciembre'])[extract(month from v_mes)::int],
      extract(year from v_mes)::int;
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['certificaciones', 'partes_horas', 'materiales', 'subcontratas', 'alquileres',
                           'combustible', 'gastos_viaje']
  loop
    execute format(
      'create trigger proteger_mes_cerrado before insert or update or delete on public.%I
         for each row execute function private.proteger_mes_cerrado()', t);
  end loop;
end;
$$;

-- Certificaciones: lo certificado en un mes es su importe a origen menos el de la anterior, así que
-- tocar una certificación cambia el mes de la siguiente. No se toca si una posterior está en un mes cerrado.

create function private.proteger_cadena_certificaciones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Un cambio que no toca el número ni el importe no afecta a las demás
  if tg_op = 'UPDATE' and new.obra_id = old.obra_id and new.numero = old.numero
     and new.importe_origen = old.importe_origen then
    return new;
  end if;
  if exists (
    select 1
    from public.certificaciones c
    join public.meses_cerrados m on m.obra_id = c.obra_id and m.mes = c.mes
    where c.obra_id = coalesce(new.obra_id, old.obra_id)
      and c.numero > least(new.numero, old.numero)
  ) then
    raise exception 'No se puede cambiar esta certificación: hay otra posterior en un mes cerrado, y cambiaría lo certificado en ese mes.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger proteger_cadena before insert or update or delete on public.certificaciones
  for each row execute function private.proteger_cadena_certificaciones();

-- Obra: el % de gastos generales fija la estructura de cada mes; no se cambia con meses cerrados.

create function private.proteger_gastos_generales()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.gastos_generales_pct is distinct from old.gastos_generales_pct
     and exists (select 1 from public.meses_cerrados c where c.obra_id = new.id) then
    raise exception 'No se puede cambiar el %% de gastos generales: la obra tiene meses cerrados y cambiaría su resultado. Reábrelos antes.';
  end if;
  return new;
end;
$$;

create trigger proteger_gastos_generales before update on public.obras
  for each row execute function private.proteger_gastos_generales();

revoke execute on function private.proteger_mes_cerrado() from public, anon, authenticated;
revoke execute on function private.proteger_cadena_certificaciones() from public, anon, authenticated;
revoke execute on function private.proteger_gastos_generales() from public, anon, authenticated;
