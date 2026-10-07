-- Historial de los apuntes del control de obra: quién dio de alta, cambió o borró cada uno, cuándo y cómo
-- estaba antes. Lo escribe un trigger (security definer), así que nadie puede falsearlo ni borrarlo desde
-- el CRM; lo ve quien puede ver el módulo del apunte. El nombre se copia: sobrevive al borrado del usuario.

create table public.historial (
  id bigint generated always as identity primary key,
  tabla text not null,
  fila_id uuid not null,
  obra_id uuid,
  modulo text not null,
  accion text not null check (accion in ('alta', 'cambio', 'baja')),
  antes jsonb,
  despues jsonb,
  usuario_id uuid default auth.uid(),
  usuario_nombre text,
  fecha timestamptz not null default now()
);
create index on public.historial (tabla, fila_id);
create index on public.historial (obra_id);

alter table public.historial enable row level security;
create policy historial_ver on public.historial for select to authenticated
  using ((select private.tiene_permiso(modulo, 'ver')));

create function private.apuntar_historial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and to_jsonb(new) = to_jsonb(old) then
    return null;
  end if;
  insert into public.historial (tabla, fila_id, obra_id, modulo, accion, antes, despues, usuario_nombre)
  values (
    tg_table_name,
    (v_fila ->> 'id')::uuid,
    (v_fila ->> 'obra_id')::uuid,
    tg_argv[0],
    case tg_op when 'INSERT' then 'alta' when 'UPDATE' then 'cambio' else 'baja' end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    (select nombre from public.perfiles where id = auth.uid())
  );
  return null;
end;
$$;

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
    execute format(
      'create trigger historial after insert or update or delete on public.%I
         for each row execute function private.apuntar_historial(%L)',
      t.tabla, t.modulo);
  end loop;
end;
$$;
