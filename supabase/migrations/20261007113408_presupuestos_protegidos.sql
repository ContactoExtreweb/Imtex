-- Un presupuesto enviado, aceptado o rechazado no se cambia ni se borra: hasta ahora solo lo impedía la
-- pantalla (y guardar_presupuesto la cabecera). Se puede cambiar su estado, también de vuelta a borrador,
-- y entonces ya se edita. Security definer para leer el estado aunque el RLS no dejara ver el presupuesto.

create function private.presupuesto_cerrado(p_presupuesto uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Sin fila (se está borrando en cascada un borrador): no está cerrado
  select coalesce((select estado <> 'borrador' from public.presupuestos where id = p_presupuesto), false)
$$;
revoke execute on function private.presupuesto_cerrado(uuid) from public, anon;
grant execute on function private.presupuesto_cerrado(uuid) to authenticated, service_role;

create function private.proteger_presupuesto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado <> 'borrador'
     and (tg_op = 'DELETE'
          or (to_jsonb(new) - 'estado' - 'updated_at') is distinct from (to_jsonb(old) - 'estado' - 'updated_at')) then
    raise exception 'Este presupuesto no es un borrador y no se puede modificar. Vuelve a ponerlo en borrador o duplícalo.'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create function private.proteger_partes_presupuesto()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_presupuestos uuid[];
begin
  if tg_table_name = 'presupuesto_partidas' then
    v_presupuestos := array[new.presupuesto_id, old.presupuesto_id];
  else
    select array_agg(pp.presupuesto_id) into v_presupuestos
    from public.presupuesto_partidas pp
    where pp.id in (new.partida_id, old.partida_id);
  end if;
  if exists (select 1 from unnest(v_presupuestos) as x(id) where x.id is not null and private.presupuesto_cerrado(x.id)) then
    raise exception 'Este presupuesto no es un borrador y no se puede modificar. Vuelve a ponerlo en borrador o duplícalo.'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger proteger before update or delete on public.presupuestos
  for each row execute function private.proteger_presupuesto();
create trigger proteger before insert or update or delete on public.presupuesto_partidas
  for each row execute function private.proteger_partes_presupuesto();
create trigger proteger before insert or update or delete on public.presupuesto_lineas
  for each row execute function private.proteger_partes_presupuesto();
