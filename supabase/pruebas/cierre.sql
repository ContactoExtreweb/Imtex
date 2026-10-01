-- Prueba del cierre de meses. Solo contra imtex-dev:
--   npx supabase db query --linked -f supabase/pruebas/cierre.sql
-- Crea una obra con apuntes en enero y febrero, cierra enero y comprueba qué se puede hacer y qué no.
-- Lo deshace todo al final: en la base de datos no queda nada. Devuelve los fallos y un resumen.
-- Los triggers valen para cualquier rol, así que se prueba como postgres (sin RLS de por medio).

create or replace function pg_temp.probar_cierre()
returns jsonb
language plpgsql
as $$
declare
  res jsonb := '[]';
  t record;
  o uuid;          -- obra
  enero constant date := date '2026-01-01';
  febrero constant date := date '2026-02-01';
  marzo constant date := date '2026-03-01';
  id_enero uuid;
  id_febrero uuid;
  numero int := 0; -- números de certificación, sin repetir
  c1 uuid;
  c2 uuid;
  -- Si la sentencia de cada caso se ha podido ejecutar. Solo cuenta como «bloqueada» la excepción
  -- de los triggers (raise exception); cualquier otro error es un fallo de la prueba y la corta.
  ok boolean;
begin
  begin
    insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra cierre') returning id into o;

    for t in
      select * from (values
        ('certificaciones', 'numero, importe_origen', '$3, 100'),
        ('partes_horas', 'fecha, operario', 'current_date, ''x'''),
        ('materiales', 'fecha, importe', 'current_date, 1'),
        ('subcontratas', 'fecha, importe', 'current_date, 1'),
        ('alquileres', 'fecha, importe', 'current_date, 1'),
        ('combustible', 'fecha, tipo_vehiculo, importe', 'current_date, ''furgon'', 1'),
        ('gastos_viaje', 'fecha, tipo, importe', 'current_date, ''dietas'', 1')
      ) as v(tabla, columnas, valores)
    loop
      declare
        alta constant text := format('insert into public.%I (obra_id, mes, %s) values ($1, $2, %s) returning id',
                                     t.tabla, t.columnas, t.valores);
        caso record;
      begin
        -- Con todo abierto: un apunte en enero y otro en febrero
        numero := numero + 1; execute alta into id_enero using o, enero, numero;
        numero := numero + 1; execute alta into id_febrero using o, febrero, numero;

        insert into public.meses_cerrados (obra_id, mes) values (o, enero);

        numero := numero + 2; -- para las dos altas de abajo
        for caso in
          select * from (values
            ('alta en el mes cerrado', false, replace(alta, ' returning id', ''), enero, numero - 1, null::uuid),
            ('cambio en el mes cerrado', false, format('update public.%I set mes = mes where id = $4', t.tabla), null, null, id_enero),
            ('borrado en el mes cerrado', false, format('delete from public.%I where id = $4', t.tabla), null, null, id_enero),
            ('mover al mes cerrado', false, format('update public.%I set mes = $2 where id = $4', t.tabla), enero, null, id_febrero),
            ('sacar del mes cerrado', false, format('update public.%I set mes = $2 where id = $4', t.tabla), febrero, null, id_enero),
            ('alta en un mes abierto', true, replace(alta, ' returning id', ''), marzo, numero, null),
            ('cambio en un mes abierto', true, format('update public.%I set mes = mes where id = $4', t.tabla), null, null, id_febrero)
          ) as c(nombre, esperado, sentencia, mes, n, id)
        loop
          begin
            execute caso.sentencia using o, caso.mes, caso.n, caso.id;
            ok := true;
          exception when raise_exception then
            ok := false;
          end;
          res := res || jsonb_build_object('caso', t.tabla || ': ' || caso.nombre, 'esperado', caso.esperado, 'obtenido', ok);
        end loop;

        -- Al reabrir, enero vuelve a poder cambiarse
        delete from public.meses_cerrados where obra_id = o and mes = enero;
        begin
          execute format('update public.%I set mes = mes where id = $1', t.tabla) using id_enero;
          ok := true;
        exception when raise_exception then
          ok := false;
        end;
        res := res || jsonb_build_object('caso', t.tabla || ': cambio tras reabrir', 'esperado', true, 'obtenido', ok);
      end;
    end loop;

    -- Cadena de certificaciones: con febrero cerrado y enero abierto, la de enero no puede cambiar
    -- de importe ni borrarse (cambiaría lo certificado en febrero), pero sí su descripción.
    insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra cadena') returning id into o;
    insert into public.certificaciones (obra_id, mes, numero, importe_origen) values (o, enero, 1, 100) returning id into c1;
    insert into public.certificaciones (obra_id, mes, numero, importe_origen) values (o, febrero, 2, 250) returning id into c2;
    insert into public.meses_cerrados (obra_id, mes) values (o, febrero);
    for t in
      select * from (values
        ('cadena: importe de la anterior a un mes cerrado', false, 'update public.certificaciones set importe_origen = 120 where id = $1'),
        ('cadena: borrar la anterior a un mes cerrado', false, 'delete from public.certificaciones where id = $1'),
        ('cadena: descripción de la anterior a un mes cerrado', true, 'update public.certificaciones set descripcion = ''x'' where id = $1')
      ) as v(nombre, esperado, sentencia)
    loop
      begin
        execute t.sentencia using c1;
        ok := true;
      exception when raise_exception then
        ok := false;
      end;
      res := res || jsonb_build_object('caso', t.nombre, 'esperado', t.esperado, 'obtenido', ok);
    end loop;

    -- % de gastos generales: no cambia con meses cerrados; lo demás de la obra sí
    for t in
      select * from (values
        ('obra: % de gastos generales con meses cerrados', false, 'update public.obras set gastos_generales_pct = 14 where id = $1', false),
        ('obra: nombre con meses cerrados', true, 'update public.obras set nombre = ''x'' where id = $1', false),
        ('obra: % de gastos generales tras reabrir', true, 'update public.obras set gastos_generales_pct = 14 where id = $1', true)
      ) as v(nombre, esperado, sentencia, reabrir)
    loop
      begin
        if t.reabrir then delete from public.meses_cerrados where obra_id = o; end if;
        execute t.sentencia using o;
        ok := true;
      exception when raise_exception then
        ok := false;
      end;
      res := res || jsonb_build_object('caso', t.nombre, 'esperado', t.esperado, 'obtenido', ok);
    end loop;

    raise exception using errcode = 'IM001', message = 'deshacer datos de prueba';
  exception when sqlstate 'IM001' then
    null;
  end;
  return res;
end;
$$;

with c as (
  select * from jsonb_to_recordset(pg_temp.probar_cierre()) as c(caso text, esperado boolean, obtenido boolean)
)
select caso, esperado, obtenido from c where esperado is distinct from obtenido
union all
select 'RESUMEN: ' || count(*) || ' comprobaciones, '
  || count(*) filter (where esperado is distinct from obtenido) || ' fallos', null, null
from c;
