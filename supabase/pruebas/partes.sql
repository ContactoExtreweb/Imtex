-- Prueba de apuntar_parte: de la hoja en papel al control de obra. Solo contra imtex-dev:
--   npx supabase db query --linked -f supabase/pruebas/partes.sql
-- Apunta un parte completo y comprueba sus apuntes, y prueba que cada parte incompleto o raro se rechaza
-- sin dejar nada a medias. Lo deshace todo al final. Devuelve los fallos y un resumen.
-- Se prueba como postgres (sin RLS); los permisos están en permisos.sql.

create or replace function pg_temp.probar_partes()
returns jsonb
language plpgsql
as $$
declare
  res jsonb := '[]';
  caso record;
  o uuid;           -- obra
  o_cerrada uuid;   -- obra con marzo cerrado
  cat uuid;
  a uuid;           -- trabajadores con categoría
  b uuid;
  sin_cat uuid;     -- y uno sin categoría
  p uuid;
  tf public.tarifas_combustible;
  tarifa numeric;
  ok boolean;
  n int;
  h public.partes_horas;
  cb public.combustible;
  marzo constant date := date '2026-03-10';
begin
  begin
    insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra partes') returning id into o;
    insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra cerrada') returning id into o_cerrada;
    insert into public.meses_cerrados (obra_id, mes) values (o_cerrada, date '2026-03-01');
    insert into public.categorias_profesionales (nombre, precio_ord, precio_ext) values ('Oficial prueba', 20, 30)
      returning id into cat;
    insert into public.trabajadores (nombre, categoria_id) values ('Ana Prueba', cat) returning id into a;
    insert into public.trabajadores (nombre, categoria_id) values ('Blas Prueba', cat) returning id into b;
    insert into public.trabajadores (nombre) values ('Sin Categoría') returning id into sin_cat;
    select * into tf from public.tarifas_combustible;
    tarifa := round(tf.precio_litro_ref * tf.consumo_furgon_l100 / 100, 3);

    -- 1. Un parte completo: dos trabajadores y la furgoneta
    insert into public.partes_trabajo (foto, obra_id, fecha, lineas, vehiculo, km_salida, km_llegada)
    values (gen_random_uuid()::text, o, marzo,
            jsonb_build_array(
              jsonb_build_object('nombre', 'Ana', 'trabajador_id', a, 'horas_ord', 8, 'horas_ext', 2),
              jsonb_build_object('nombre', 'Blas', 'trabajador_id', b, 'horas_ord', 8, 'horas_ext', 0)),
            'Furgoneta 1234 ABC', 12310, 12394)
    returning id into p;
    perform public.apuntar_parte(p);

    select count(*) into n from public.partes_horas where parte_trabajo_id = p;
    res := res || jsonb_build_object('caso', 'completo: una línea de horas por trabajador', 'esperado', true, 'obtenido', n = 2);
    select * into h from public.partes_horas where parte_trabajo_id = p and trabajador_id = a;
    res := res || jsonb_build_object('caso', 'completo: horas, precios de la categoría, nombre y mes', 'esperado', true,
      'obtenido', h.horas_ord = 8 and h.horas_ext = 2 and h.precio_ord = 20 and h.precio_ext = 30
                  and h.operario = 'Ana Prueba' and h.categoria_id = cat and h.mes = date '2026-03-01' and h.fecha = marzo);
    select * into cb from public.combustible where parte_trabajo_id = p;
    res := res || jsonb_build_object('caso', 'completo: combustible con km × tarifa de furgoneta', 'esperado', true,
      'obtenido', cb.km = 84 and cb.tarifa_km = tarifa and cb.importe = round(84 * tarifa, 2)
                  and cb.tipo_vehiculo = 'furgon' and cb.vehiculo = 'Furgoneta 1234 ABC' and cb.mes = date '2026-03-01');
    res := res || jsonb_build_object('caso', 'completo: el parte queda apuntado', 'esperado', true,
      'obtenido', (select estado = 'apuntado' and apuntado_el is not null from public.partes_trabajo where id = p));

    begin
      perform public.apuntar_parte(p);
      ok := true;
    exception when raise_exception then
      ok := false;
    end;
    res := res || jsonb_build_object('caso', 'apuntar dos veces', 'esperado', false, 'obtenido', ok);

    -- 2. Sin vehículo: solo horas
    insert into public.partes_trabajo (foto, obra_id, fecha, lineas)
    values (gen_random_uuid()::text, o, marzo,
            jsonb_build_array(jsonb_build_object('nombre', 'Ana', 'trabajador_id', a, 'horas_ord', 6, 'horas_ext', 0)))
    returning id into p;
    perform public.apuntar_parte(p);
    res := res || jsonb_build_object('caso', 'sin km: horas y ningún combustible', 'esperado', true,
      'obtenido', (select count(*) = 1 from public.partes_horas where parte_trabajo_id = p)
                  and not exists (select 1 from public.combustible where parte_trabajo_id = p));

    -- 3. Camión: la tarifa del camión
    insert into public.partes_trabajo (foto, obra_id, fecha, lineas, tipo_vehiculo, km_salida, km_llegada)
    values (gen_random_uuid()::text, o, marzo,
            jsonb_build_array(jsonb_build_object('nombre', 'Ana', 'trabajador_id', a, 'horas_ord', 8, 'horas_ext', 0)),
            'camion', 100, 200)
    returning id into p;
    perform public.apuntar_parte(p);
    res := res || jsonb_build_object('caso', 'camión: tarifa del camión', 'esperado', true,
      'obtenido', (select tarifa_km = round(tf.precio_litro_ref * tf.consumo_camion_l100 / 100, 3) and tipo_vehiculo = 'camion'
                   from public.combustible where parte_trabajo_id = p));

    -- 4. Lo que no se puede apuntar. Ninguno deja apuntes a medias.
    for caso in
      select * from (values
        ('sin obra', null::uuid, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), null::numeric, null::numeric, 'revisar'),
        ('sin fecha', o, null, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), null, null, 'revisar'),
        ('fecha posterior a hoy', o, current_date + 1, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), null, null, 'revisar'),
        ('sin trabajadores', o, marzo, '[]'::jsonb, null, null, 'revisar'),
        ('fila sin trabajador elegido', o, marzo, jsonb_build_array(jsonb_build_object('nombre', 'Pepe', 'trabajador_id', null, 'horas_ord', 8)), null, null, 'revisar'),
        ('trabajador sin categoría (y otro bien: no queda a medias)', o, marzo,
          jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8), jsonb_build_object('trabajador_id', sin_cat, 'horas_ord', 8)), null, null, 'revisar'),
        ('sin horas', o, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 0, 'horas_ext', 0)), null, null, 'revisar'),
        ('horas negativas', o, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 10, 'horas_ext', -2)), null, null, 'revisar'),
        ('18 horas en un día', o, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 10, 'horas_ext', 8)), null, null, 'revisar'),
        ('trabajador repetido', o, marzo,
          jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8), jsonb_build_object('trabajador_id', a, 'horas_ord', 2)), null, null, 'revisar'),
        ('solo km de salida', o, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), 100, null, 'revisar'),
        ('km de llegada menores', o, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), 200, 100, 'revisar'),
        ('2.000 km en un día', o, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), 100, 2100, 'revisar'),
        ('descartado', o, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), null, null, 'descartado'),
        ('mes cerrado en la obra', o_cerrada, marzo, jsonb_build_array(jsonb_build_object('trabajador_id', a, 'horas_ord', 8)), 100, 150, 'revisar')
      ) as v(nombre, obra, fecha, lineas, km_salida, km_llegada, estado)
    loop
      insert into public.partes_trabajo (foto, obra_id, fecha, lineas, km_salida, km_llegada, estado)
      values (gen_random_uuid()::text, caso.obra, caso.fecha, caso.lineas, caso.km_salida, caso.km_llegada, caso.estado)
      returning id into p;
      begin
        perform public.apuntar_parte(p);
        ok := true;
      exception when raise_exception then
        ok := false;
      end;
      res := res || jsonb_build_object('caso', caso.nombre, 'esperado', false, 'obtenido', ok);
      res := res || jsonb_build_object('caso', caso.nombre || ': nada a medias', 'esperado', true,
        'obtenido', not exists (select 1 from public.partes_horas where parte_trabajo_id = p)
                    and not exists (select 1 from public.combustible where parte_trabajo_id = p)
                    and (select estado from public.partes_trabajo where id = p) = caso.estado);
    end loop;

    -- 5. Un parte apuntado no se borra mientras tenga apuntes
    begin
      delete from public.partes_trabajo where id = (select parte_trabajo_id from public.partes_horas where trabajador_id = b limit 1);
      ok := true;
    exception when foreign_key_violation then
      ok := false;
    end;
    res := res || jsonb_build_object('caso', 'borrar un parte con apuntes', 'esperado', false, 'obtenido', ok);

    raise exception using errcode = 'IM001', message = 'deshacer datos de prueba';
  exception when sqlstate 'IM001' then
    null;
  end;
  return res;
end;
$$;

with c as (
  select * from jsonb_to_recordset(pg_temp.probar_partes()) as c(caso text, esperado boolean, obtenido boolean)
)
select caso, esperado, obtenido from c where esperado is distinct from obtenido
union all
select 'RESUMEN: ' || count(*) || ' comprobaciones, '
  || count(*) filter (where esperado is distinct from obtenido) || ' fallos', null, null
from c;
