-- Prueba de permisos por rol (RLS). Solo contra imtex-dev:
--   npx supabase db query --linked -f supabase/pruebas/permisos.sql
-- Crea un usuario por rol (más uno inactivo y anon), comprueba qué ve, crea, edita y borra
-- cada uno, y lo deshace todo al final: en la base de datos no queda nada.
-- Lo esperado sale de permisos_rol, así que la prueba sigue valiendo si cambia la matriz.
-- Devuelve solo los fallos y una línea de resumen.
-- Tabla nueva en el CRM → añade sus pruebas abajo y su módulo en la consulta final.

create or replace function pg_temp.probar_permisos()
returns jsonb
language plpgsql
as $$
declare
  res jsonb := '[]';
  u record;
  p record;
  uid uuid;
  otro uuid;
  nuevo uuid;
  f_cliente uuid;
  f_obra uuid;
  f_categoria uuid;
  f_trabajador uuid;
  f_propia uuid;
  n int;
  ok boolean;
begin
  begin
    for u in
      select * from (values
        ('gerencia', 'gerencia', true),
        ('oficina_tecnica', 'oficina_tecnica', true),
        ('administracion', 'administracion', true),
        ('encargado', 'encargado', true),
        ('operario', 'operario', true),
        ('gerencia_inactivo', 'gerencia', false),
        ('anon', null, null)
      ) as v(usuario, rol, activo)
    loop
      -- Datos de prueba, creados como postgres (sin RLS)
      uid := null;
      f_propia := null;
      if u.rol is not null then
        uid := gen_random_uuid();
        insert into auth.users (id, email) values (uid, u.usuario || '@prueba.test');
        insert into public.perfiles (id, nombre, email, rol, activo)
          values (uid, 'Prueba ' || u.usuario, u.usuario || '@prueba.test', u.rol, u.activo);
        insert into public.trabajadores (nombre, perfil_id) values ('Ficha propia', uid)
          returning id into f_propia;
      end if;

      otro := gen_random_uuid();  -- perfil ajeno
      insert into auth.users (id, email) values (otro, 'otro-' || u.usuario || '@prueba.test');
      insert into public.perfiles (id, nombre, email, rol)
        values (otro, 'Otro', 'otro-' || u.usuario || '@prueba.test', 'operario');
      nuevo := gen_random_uuid();  -- usuario sin perfil, para probar a crearle uno
      insert into auth.users (id, email) values (nuevo, 'nuevo-' || u.usuario || '@prueba.test');

      insert into public.clientes (nombre) values ('Cliente prueba') returning id into f_cliente;
      insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra prueba')
        returning id into f_obra;
      insert into public.categorias_profesionales (nombre) values ('Categoría prueba')
        returning id into f_categoria;
      insert into public.trabajadores (nombre) values ('Trabajador prueba') returning id into f_trabajador;

      -- Cambio de identidad
      if u.rol is null then
        perform set_config('request.jwt.claims', '', true);
        set local role anon;
      else
        perform set_config('request.jwt.claims',
          json_build_object('sub', uid, 'role', 'authenticated')::text, true);
        set local role authenticated;
      end if;

      -- En cada tabla: ver, insertar, editar y borrar (en ese orden, sobre la misma fila)
      for p in
        select * from (values
          ('clientes', 'ver', 'select from public.clientes where id = $1', f_cliente),
          ('clientes', 'insertar', 'insert into public.clientes (nombre) values (''x'')', null),
          ('clientes', 'editar', 'update public.clientes set nombre = nombre where id = $1', f_cliente),
          ('clientes', 'borrar', 'delete from public.clientes where id = $1', f_cliente),

          ('obras', 'ver', 'select from public.obras where id = $1', f_obra),
          ('obras', 'insertar', 'insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, ''x'')', null),
          ('obras', 'editar', 'update public.obras set nombre = nombre where id = $1', f_obra),
          ('obras', 'borrar', 'delete from public.obras where id = $1', f_obra),

          ('categorias_profesionales', 'ver', 'select from public.categorias_profesionales where id = $1', f_categoria),
          ('categorias_profesionales', 'insertar', 'insert into public.categorias_profesionales (nombre) values (''x'')', null),
          ('categorias_profesionales', 'editar', 'update public.categorias_profesionales set nombre = nombre where id = $1', f_categoria),
          ('categorias_profesionales', 'borrar', 'delete from public.categorias_profesionales where id = $1', f_categoria),

          ('trabajadores', 'ver', 'select from public.trabajadores where id = $1', f_trabajador),
          ('trabajadores', 'ver_propio', 'select from public.trabajadores where id = $1', f_propia),
          ('trabajadores', 'insertar', 'insert into public.trabajadores (nombre) values (''x'')', null),
          ('trabajadores', 'editar', 'update public.trabajadores set nombre = nombre where id = $1', f_trabajador),
          ('trabajadores', 'borrar', 'delete from public.trabajadores where id = $1', f_trabajador),

          ('tarifas_combustible', 'ver', 'select from public.tarifas_combustible', null),
          ('tarifas_combustible', 'insertar', 'insert into public.tarifas_combustible (precio_litro_ref, consumo_furgon_l100, consumo_camion_l100) values (1, 1, 1)', null),
          ('tarifas_combustible', 'editar', 'update public.tarifas_combustible set precio_litro_ref = precio_litro_ref', null),
          ('tarifas_combustible', 'borrar', 'delete from public.tarifas_combustible', null),

          ('perfiles', 'ver', 'select from public.perfiles where id = $1', otro),
          ('perfiles', 'ver_propio', 'select from public.perfiles where id = $1', uid),
          ('perfiles', 'insertar', 'insert into public.perfiles (id, nombre, email, rol) values ($1, ''x'', ''x'', ''operario'')', nuevo),
          ('perfiles', 'editar', 'update public.perfiles set nombre = nombre where id = $1', otro),
          ('perfiles', 'borrar', 'delete from public.perfiles where id = $1', otro),

          ('roles', 'ver', 'select from public.roles', null),
          ('roles', 'insertar', 'insert into public.roles (codigo, nombre) values (''x'', ''x'')', null),
          ('roles', 'editar', 'update public.roles set nombre = nombre', null),
          ('roles', 'borrar', 'delete from public.roles where codigo = ''operario''', null),

          ('permisos_rol', 'ver', 'select from public.permisos_rol', null),
          ('permisos_rol', 'insertar', 'insert into public.permisos_rol (rol, modulo) values (''operario'', ''x'')', null),
          ('permisos_rol', 'editar', 'update public.permisos_rol set puede_ver = puede_ver', null),
          ('permisos_rol', 'borrar', 'delete from public.permisos_rol where rol = ''operario''', null)
        ) as t(tabla, accion, sentencia, arg)
      loop
        begin
          execute p.sentencia using p.arg;
          get diagnostics n = row_count;
          ok := n > 0;
        exception when insufficient_privilege then
          ok := false;  -- RLS o falta de grant
        end;
        res := res || jsonb_build_object('usuario', u.usuario, 'rol', u.rol, 'activo', u.activo,
          'tabla', p.tabla, 'accion', p.accion, 'obtenido', ok);
      end loop;

      reset role;
    end loop;

    raise exception using errcode = 'IM001', message = 'deshacer datos de prueba';
  exception when sqlstate 'IM001' then
    null;
  end;
  return res;
end;
$$;

with r as (
  select *
  from jsonb_to_recordset(pg_temp.probar_permisos())
    as r(usuario text, rol text, activo boolean, tabla text, accion text, obtenido boolean)
),
-- Módulos que dan acceso a cada tabla (ver = cualquiera de la lista; editar = ese módulo)
m (tabla, ver, editar) as (values
  ('clientes', array['clientes'], 'clientes'),
  ('obras', array['obras'], 'obras'),
  ('categorias_profesionales', array['ajustes', 'control_obra'], 'ajustes'),
  ('trabajadores', array['ajustes', 'control_obra'], 'ajustes'),
  ('tarifas_combustible', array['ajustes', 'control_obra'], 'ajustes'),
  ('perfiles', array['usuarios'], 'usuarios'),
  ('roles', null, null),
  ('permisos_rol', null, null)
),
c as (
  select r.*,
    case
      when r.rol is null then false                                   -- anon
      when r.tabla in ('roles', 'permisos_rol') then r.accion = 'ver' -- solo lectura
      when r.accion = 'ver_propio' then true
      when r.tabla = 'tarifas_combustible' and r.accion in ('insertar', 'borrar') then false
      else r.activo and exists (
        select 1 from public.permisos_rol pr
        where pr.rol = r.rol
          and case when r.accion = 'ver'
                   then pr.modulo = any (m.ver) and (pr.puede_ver or pr.puede_editar)
                   else pr.modulo = m.editar and pr.puede_editar
              end)
    end as esperado
  from r join m using (tabla)
)
select usuario, tabla, accion, esperado, obtenido
from c
where esperado is distinct from obtenido
union all
select 'RESUMEN', count(*) || ' comprobaciones',
  count(*) filter (where esperado is distinct from obtenido) || ' fallos', null, null
from c;
