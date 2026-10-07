-- Prueba de los presupuestos protegidos y del historial de apuntes. Solo contra imtex-dev:
--   npx supabase db query --linked -f supabase/pruebas/protecciones.sql
-- Lo deshace todo al final. Devuelve los fallos y un resumen. Se prueba como postgres (los triggers
-- se aplican igual); los permisos están en permisos.sql.

create or replace function pg_temp.probar_protecciones()
returns jsonb
language plpgsql
as $$
declare
  res jsonb := '[]';
  pr uuid;
  pa uuid;
  li uuid;
  borrador uuid;
  o uuid;
  m uuid;
  h public.historial;
  n int;
begin
  begin
    insert into public.presupuestos (codigo) values (gen_random_uuid()::text) returning id into pr;
    insert into public.presupuesto_partidas (presupuesto_id) values (pr) returning id into pa;
    insert into public.presupuesto_lineas (partida_id, descripcion) values (pa, 'Línea') returning id into li;
    insert into public.presupuestos (codigo) values (gen_random_uuid()::text) returning id into borrador;
    update public.presupuestos set estado = 'enviado' where id = pr;
    res := res || jsonb_build_object('caso', 'borrador: se envía', 'esperado', true,
      'obtenido', (select estado = 'enviado' from public.presupuestos where id = pr));

    -- Enviado: no se toca nada de su contenido
    declare
      casos text[][] := array[
        ['cambiar la cabecera', format('update public.presupuestos set titulo = ''otro'' where id = %L', pr)],
        ['añadir una partida', format('insert into public.presupuesto_partidas (presupuesto_id) values (%L)', pr)],
        ['cambiar una partida', format('update public.presupuesto_partidas set cantidad = 2 where id = %L', pa)],
        ['borrar una partida', format('delete from public.presupuesto_partidas where id = %L', pa)],
        ['añadir una línea', format('insert into public.presupuesto_lineas (partida_id, descripcion) values (%L, ''x'')', pa)],
        ['cambiar una línea', format('update public.presupuesto_lineas set coste_unitario = 9 where id = %L', li)],
        ['borrar una línea', format('delete from public.presupuesto_lineas where id = %L', li)],
        ['mover una línea a un borrador', format(
          'update public.presupuesto_lineas set partida_id = (select id from public.presupuesto_partidas where presupuesto_id = %L) where id = %L',
          borrador, li)],
        ['borrar el presupuesto', format('delete from public.presupuestos where id = %L', pr)]
      ];
      i int;
    begin
      insert into public.presupuesto_partidas (presupuesto_id) values (borrador);
      for i in 1 .. array_length(casos, 1) loop
        begin
          execute casos[i][2];
          res := res || jsonb_build_object('caso', 'enviado: ' || casos[i][1], 'esperado', false, 'obtenido', true);
        exception when insufficient_privilege then
          res := res || jsonb_build_object('caso', 'enviado: ' || casos[i][1], 'esperado', false, 'obtenido', false);
        end;
      end loop;
    end;

    update public.presupuestos set estado = 'aceptado' where id = pr;
    res := res || jsonb_build_object('caso', 'enviado: se acepta', 'esperado', true,
      'obtenido', (select estado = 'aceptado' from public.presupuestos where id = pr));
    update public.presupuestos set estado = 'borrador' where id = pr;
    update public.presupuestos set titulo = 'Cambiado' where id = pr;
    update public.presupuesto_lineas set coste_unitario = 9 where id = li;
    res := res || jsonb_build_object('caso', 'vuelto a borrador: se edita', 'esperado', true,
      'obtenido', (select titulo = 'Cambiado' from public.presupuestos where id = pr)
                  and (select coste_unitario = 9 from public.presupuesto_lineas where id = li));
    delete from public.presupuestos where id = pr;
    res := res || jsonb_build_object('caso', 'borrador: se borra con sus partidas y líneas', 'esperado', true,
      'obtenido', not exists (select 1 from public.presupuesto_lineas where id = li));

    -- Historial: alta, cambio (solo si cambia algo) y baja, con el antes y el después
    insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra historial') returning id into o;
    insert into public.materiales (obra_id, mes, fecha, importe) values (o, date '2026-01-01', current_date, 10)
      returning id into m;
    update public.materiales set importe = 12 where id = m;
    update public.materiales set importe = 12 where id = m;
    delete from public.materiales where id = m;

    select count(*) into n from public.historial where tabla = 'materiales' and fila_id = m;
    res := res || jsonb_build_object('caso', 'historial: alta, un cambio y baja (el cambio sin cambios no cuenta)',
      'esperado', true, 'obtenido', n = 3);
    select * into h from public.historial where fila_id = m and accion = 'cambio';
    res := res || jsonb_build_object('caso', 'historial: el cambio guarda antes y después, la obra y el módulo',
      'esperado', true, 'obtenido', (h.antes ->> 'importe')::numeric = 10 and (h.despues ->> 'importe')::numeric = 12
                                    and h.obra_id = o and h.modulo = 'control_obra');
    select * into h from public.historial where fila_id = m and accion = 'baja';
    res := res || jsonb_build_object('caso', 'historial: la baja guarda cómo estaba', 'esperado', true,
      'obtenido', (h.antes ->> 'importe')::numeric = 12 and h.despues is null);

    raise exception using errcode = 'IM001', message = 'deshacer datos de prueba';
  exception when sqlstate 'IM001' then
    null;
  end;
  return res;
end;
$$;

with c as (
  select * from jsonb_to_recordset(pg_temp.probar_protecciones()) as c(caso text, esperado boolean, obtenido boolean)
)
select caso, esperado, obtenido from c where esperado is distinct from obtenido
union all
select 'RESUMEN: ' || count(*) || ' comprobaciones, '
  || count(*) filter (where esperado is distinct from obtenido) || ' fallos', null, null
from c;
