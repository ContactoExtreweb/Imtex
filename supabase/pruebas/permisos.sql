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
  f_precio uuid;
  f_tipo uuid;
  f_tipo_linea uuid;
  f_presupuesto uuid;
  f_partida uuid;
  f_linea uuid;
  f_nota uuid;
  f_obra_costes uuid;
  f_certificaciones uuid;
  f_partes_horas uuid;
  f_materiales uuid;
  f_subcontratas uuid;
  f_alquileres uuid;
  f_combustible uuid;
  f_gastos_viaje uuid;
  f_nota_ajena uuid;
  f_web_publicada uuid;
  f_web_borrador uuid;
  f_foto_publicada uuid;
  f_foto_borrador uuid;
  f_objeto uuid;
  f_obra_cierre uuid;
  f_trabajador_baja uuid;
  f_baja_ajena uuid;
  f_baja_propia uuid;
  f_baja_en_su_nombre uuid;
  f_objeto_baja uuid;
  f_objeto_baja_propio uuid;
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
      -- Datos de prueba, creados como postgres (sin RLS) y sin la identidad de la vuelta anterior
      perform set_config('request.jwt.claims', '', true);
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

      insert into public.precios (codigo, familia, descripcion) values (gen_random_uuid()::text, 'materiales', 'Precio prueba')
        returning id into f_precio;
      insert into public.partidas_tipo (codigo) values ('T.prueba') returning id into f_tipo;
      insert into public.partidas_tipo_lineas (partida_tipo_id, descripcion, coste_unitario) values (f_tipo, 'Línea prueba', 1)
        returning id into f_tipo_linea;
      insert into public.presupuestos (codigo) values (gen_random_uuid()::text) returning id into f_presupuesto;
      insert into public.presupuesto_partidas (presupuesto_id) values (f_presupuesto) returning id into f_partida;
      insert into public.presupuesto_lineas (partida_id, descripcion) values (f_partida, 'Línea prueba')
        returning id into f_linea;

      -- Control de obra: una obra aparte (la de arriba se borra en su prueba) con un apunte de cada tipo
      insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra con costes')
        returning id into f_obra_costes;
      insert into public.certificaciones (obra_id, mes, numero, importe_origen) values (f_obra_costes, date '2026-01-01', 1, 100)
        returning id into f_certificaciones;
      insert into public.partes_horas (obra_id, mes, fecha, operario) values (f_obra_costes, date '2026-01-01', current_date, 'x')
        returning id into f_partes_horas;
      insert into public.materiales (obra_id, mes, fecha, importe) values (f_obra_costes, date '2026-01-01', current_date, 1)
        returning id into f_materiales;
      insert into public.subcontratas (obra_id, mes, fecha, importe) values (f_obra_costes, date '2026-01-01', current_date, 1)
        returning id into f_subcontratas;
      insert into public.alquileres (obra_id, mes, fecha, importe) values (f_obra_costes, date '2026-01-01', current_date, 1)
        returning id into f_alquileres;
      insert into public.combustible (obra_id, mes, fecha, tipo_vehiculo, importe) values (f_obra_costes, date '2026-01-01', current_date, 'furgon', 1)
        returning id into f_combustible;
      insert into public.gastos_viaje (obra_id, mes, fecha, tipo, importe) values (f_obra_costes, date '2026-01-01', current_date, 'dietas', 1)
        returning id into f_gastos_viaje;

      -- Notas: una del propio usuario (si lo hay) y otra ajena
      f_nota := null;
      if uid is not null then
        insert into public.notas (perfil_id, texto) values (uid, 'Nota propia') returning id into f_nota;
      end if;
      insert into public.notas (perfil_id, texto) values (otro, 'Nota ajena') returning id into f_nota_ajena;

      -- Galería de la web: una obra publicada y un borrador, cada una con una foto, y un archivo en el bucket
      insert into public.web_obras (slug, titulo, servicio, publicada)
        values ('pub-' || gen_random_uuid(), 'Publicada', 'otros', true) returning id into f_web_publicada;
      insert into public.web_obras (slug, titulo) values ('bor-' || gen_random_uuid(), 'Borrador')
        returning id into f_web_borrador;
      insert into public.web_fotos (obra_id, storage_path, ancho, alto)
        values (f_web_publicada, gen_random_uuid()::text, 1, 1) returning id into f_foto_publicada;
      insert into public.web_fotos (obra_id, storage_path, ancho, alto)
        values (f_web_borrador, gen_random_uuid()::text, 1, 1) returning id into f_foto_borrador;
      insert into storage.objects (bucket_id, name) values ('galeria', 'prueba/' || gen_random_uuid())
        returning id into f_objeto;

      -- Cierre de meses: una obra aparte con abril cerrado (en la de costes bloquearía sus pruebas)
      insert into public.obras (codigo, nombre) values (gen_random_uuid()::text, 'Obra con cierre')
        returning id into f_obra_cierre;
      insert into public.meses_cerrados (obra_id, mes) values (f_obra_cierre, date '2026-04-01');

      -- Bajas: un papel de otro trabajador y, si hay usuario, dos de su ficha: el que subió él
      -- y el que le subieron en su nombre. Y un archivo de cada carpeta en el bucket.
      -- Ficha aparte: la de arriba se borra en su prueba, y una ficha con papeles no se deja borrar.
      insert into public.trabajadores (nombre) values ('Trabajador con baja') returning id into f_trabajador_baja;
      insert into public.bajas_documentos (trabajador_id, tipo, ruta, nombre_archivo, tipo_mime, tamano, subido_por)
        values (f_trabajador_baja, 'baja', f_trabajador_baja || '/' || gen_random_uuid(), 'x.pdf', 'application/pdf', 1, otro)
        returning id into f_baja_ajena;
      insert into storage.objects (bucket_id, name) values ('bajas', f_trabajador_baja || '/' || gen_random_uuid())
        returning id into f_objeto_baja;
      f_baja_propia := null;
      f_baja_en_su_nombre := null;
      f_objeto_baja_propio := null;
      if uid is not null then
        insert into public.bajas_documentos (trabajador_id, tipo, ruta, nombre_archivo, tipo_mime, tamano, subido_por)
          values (f_propia, 'baja', f_propia || '/' || gen_random_uuid(), 'x.pdf', 'application/pdf', 1, uid)
          returning id into f_baja_propia;
        insert into public.bajas_documentos (trabajador_id, tipo, ruta, nombre_archivo, tipo_mime, tamano, subido_por)
          values (f_propia, 'alta', f_propia || '/' || gen_random_uuid(), 'x.pdf', 'application/pdf', 1, otro)
          returning id into f_baja_en_su_nombre;
        insert into storage.objects (bucket_id, name) values ('bajas', f_propia || '/' || gen_random_uuid())
          returning id into f_objeto_baja_propio;
      end if;

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

          ('certificaciones', 'ver', 'select from public.certificaciones where id = $1', f_certificaciones),
          ('certificaciones', 'insertar', 'insert into public.certificaciones (obra_id, mes, numero, importe_origen) values ($1, date ''2026-02-01'', 2, 200)', f_obra_costes),
          ('certificaciones', 'editar', 'update public.certificaciones set mes = mes where id = $1', f_certificaciones),
          ('certificaciones', 'borrar', 'delete from public.certificaciones where id = $1', f_certificaciones),
          ('partes_horas', 'ver', 'select from public.partes_horas where id = $1', f_partes_horas),
          ('partes_horas', 'insertar', 'insert into public.partes_horas (obra_id, mes, fecha, operario) values ($1, date ''2026-02-01'', current_date, ''x'')', f_obra_costes),
          ('partes_horas', 'editar', 'update public.partes_horas set mes = mes where id = $1', f_partes_horas),
          ('partes_horas', 'borrar', 'delete from public.partes_horas where id = $1', f_partes_horas),
          ('materiales', 'ver', 'select from public.materiales where id = $1', f_materiales),
          ('materiales', 'insertar', 'insert into public.materiales (obra_id, mes, fecha, importe) values ($1, date ''2026-02-01'', current_date, 1)', f_obra_costes),
          ('materiales', 'editar', 'update public.materiales set mes = mes where id = $1', f_materiales),
          ('materiales', 'borrar', 'delete from public.materiales where id = $1', f_materiales),
          ('subcontratas', 'ver', 'select from public.subcontratas where id = $1', f_subcontratas),
          ('subcontratas', 'insertar', 'insert into public.subcontratas (obra_id, mes, fecha, importe) values ($1, date ''2026-02-01'', current_date, 1)', f_obra_costes),
          ('subcontratas', 'editar', 'update public.subcontratas set mes = mes where id = $1', f_subcontratas),
          ('subcontratas', 'borrar', 'delete from public.subcontratas where id = $1', f_subcontratas),
          ('alquileres', 'ver', 'select from public.alquileres where id = $1', f_alquileres),
          ('alquileres', 'insertar', 'insert into public.alquileres (obra_id, mes, fecha, importe) values ($1, date ''2026-02-01'', current_date, 1)', f_obra_costes),
          ('alquileres', 'editar', 'update public.alquileres set mes = mes where id = $1', f_alquileres),
          ('alquileres', 'borrar', 'delete from public.alquileres where id = $1', f_alquileres),
          ('combustible', 'ver', 'select from public.combustible where id = $1', f_combustible),
          ('combustible', 'insertar', 'insert into public.combustible (obra_id, mes, fecha, tipo_vehiculo, importe) values ($1, date ''2026-02-01'', current_date, ''furgon'', 1)', f_obra_costes),
          ('combustible', 'editar', 'update public.combustible set mes = mes where id = $1', f_combustible),
          ('combustible', 'borrar', 'delete from public.combustible where id = $1', f_combustible),
          ('gastos_viaje', 'ver', 'select from public.gastos_viaje where id = $1', f_gastos_viaje),
          ('gastos_viaje', 'insertar', 'insert into public.gastos_viaje (obra_id, mes, fecha, tipo, importe) values ($1, date ''2026-02-01'', current_date, ''dietas'', 1)', f_obra_costes),
          ('gastos_viaje', 'editar', 'update public.gastos_viaje set mes = mes where id = $1', f_gastos_viaje),
          ('gastos_viaje', 'borrar', 'delete from public.gastos_viaje where id = $1', f_gastos_viaje),

          -- Cierre de meses: lo ve quien ve el control de obra; cerrar y reabrir, solo cierre_meses:editar
          ('meses_cerrados', 'ver', 'select from public.meses_cerrados where obra_id = $1', f_obra_cierre),
          ('meses_cerrados', 'insertar', 'insert into public.meses_cerrados (obra_id, mes) values ($1, date ''2026-05-01'')', f_obra_cierre),
          ('meses_cerrados', 'editar', 'update public.meses_cerrados set cerrado_el = cerrado_el where obra_id = $1', f_obra_cierre),
          ('meses_cerrados', 'borrar', 'delete from public.meses_cerrados where obra_id = $1 and mes = date ''2026-04-01''', f_obra_cierre),

          -- Bajas: cada uno ve, sube y borra lo suyo; lo de los demás, con el módulo bajas. No se edita.
          ('bajas_documentos', 'ver', 'select from public.bajas_documentos where id = $1', f_baja_ajena),
          ('bajas_documentos', 'ver_propio', 'select from public.bajas_documentos where id = $1', f_baja_propia),
          ('bajas_documentos', 'insertar', 'insert into public.bajas_documentos (trabajador_id, tipo, ruta, nombre_archivo, tipo_mime, tamano) values ($1, ''baja'', $1::text || ''/'' || gen_random_uuid(), ''x'', ''application/pdf'', 1)', f_trabajador_baja),
          ('bajas_documentos', 'insertar_propio', 'insert into public.bajas_documentos (trabajador_id, tipo, ruta, nombre_archivo, tipo_mime, tamano) values ($1, ''baja'', $1::text || ''/'' || gen_random_uuid(), ''x'', ''application/pdf'', 1)', f_propia),
          ('bajas_documentos', 'editar', 'update public.bajas_documentos set tipo = tipo where id = $1', f_baja_propia),
          ('bajas_documentos', 'borrar_en_su_nombre', 'delete from public.bajas_documentos where id = $1', f_baja_en_su_nombre),
          ('bajas_documentos', 'borrar_propio', 'delete from public.bajas_documentos where id = $1', f_baja_propia),
          ('bajas_documentos', 'borrar', 'delete from public.bajas_documentos where id = $1', f_baja_ajena),
          ('storage_bajas', 'ver', 'select from storage.objects where id = $1', f_objeto_baja),
          ('storage_bajas', 'ver_propio', 'select from storage.objects where id = $1', f_objeto_baja_propio),
          ('storage_bajas', 'insertar', 'insert into storage.objects (bucket_id, name) values (''bajas'', $1::text || ''/'' || gen_random_uuid())', f_trabajador_baja),
          ('storage_bajas', 'insertar_propio', 'insert into storage.objects (bucket_id, name) values (''bajas'', coalesce($1::text, ''x'') || ''/'' || gen_random_uuid())', f_propia),

          -- Antes que perfiles: borrar el perfil ajeno borraría su nota en cascada
          ('notas', 'ver', 'select from public.notas where id = $1', f_nota_ajena),
          ('notas', 'ver_propio', 'select from public.notas where id = $1', f_nota),
          ('notas', 'insertar', 'insert into public.notas (texto) values (''x'')', null),
          ('notas', 'editar', 'update public.notas set texto = texto where id = $1', f_nota_ajena),
          ('notas', 'borrar', 'delete from public.notas where id = $1', f_nota_ajena),

          -- Galería: lo publicado lo ve todo el mundo (también sin sesión); las fotos antes que su obra
          ('web_fotos', 'ver_publicada', 'select from public.web_fotos where id = $1', f_foto_publicada),
          ('web_fotos', 'ver', 'select from public.web_fotos where id = $1', f_foto_borrador),
          ('web_fotos', 'insertar', 'insert into public.web_fotos (obra_id, storage_path, ancho, alto) values ($1, gen_random_uuid()::text, 1, 1)', f_web_borrador),
          ('web_fotos', 'editar', 'update public.web_fotos set alt = alt where id = $1', f_foto_borrador),
          ('web_fotos', 'editar_publicada', 'update public.web_fotos set alt = alt where id = $1', f_foto_publicada),
          ('web_fotos', 'borrar', 'delete from public.web_fotos where id = $1', f_foto_borrador),
          ('web_obras', 'ver_publicada', 'select from public.web_obras where id = $1', f_web_publicada),
          ('web_obras', 'ver', 'select from public.web_obras where id = $1', f_web_borrador),
          ('web_obras', 'insertar', 'insert into public.web_obras (slug, titulo) values (''x-'' || gen_random_uuid(), ''x'')', null),
          ('web_obras', 'editar', 'update public.web_obras set titulo = titulo where id = $1', f_web_borrador),
          ('web_obras', 'editar_publicada', 'update public.web_obras set titulo = titulo where id = $1', f_web_publicada),
          ('web_obras', 'borrar', 'delete from public.web_obras where id = $1', f_web_borrador),
          -- Bucket de fotos (el borrado directo en storage.objects está bloqueado: va por la API)
          ('storage_galeria', 'ver', 'select from storage.objects where id = $1', f_objeto),
          ('storage_galeria', 'insertar', 'insert into storage.objects (bucket_id, name) values (''galeria'', ''prueba/'' || gen_random_uuid())', null),

          ('perfiles', 'ver', 'select from public.perfiles where id = $1', otro),
          ('perfiles', 'ver_propio', 'select from public.perfiles where id = $1', uid),
          ('perfiles', 'insertar', 'insert into public.perfiles (id, nombre, email, rol) values ($1, ''x'', ''x'', ''operario'')', nuevo),
          ('perfiles', 'editar', 'update public.perfiles set nombre = nombre where id = $1', otro),
          ('perfiles', 'borrar', 'delete from public.perfiles where id = $1', otro),


          -- Las líneas antes que sus partidas, y estas antes que su cabecera: borrar arriba borra en cascada
          ('presupuesto_lineas', 'ver', 'select from public.presupuesto_lineas where id = $1', f_linea),
          ('presupuesto_lineas', 'insertar', 'insert into public.presupuesto_lineas (partida_id, descripcion) values ($1, ''x'')', f_partida),
          ('presupuesto_lineas', 'editar', 'update public.presupuesto_lineas set orden = orden where id = $1', f_linea),
          ('presupuesto_lineas', 'borrar', 'delete from public.presupuesto_lineas where id = $1', f_linea),
          ('presupuesto_partidas', 'ver', 'select from public.presupuesto_partidas where id = $1', f_partida),
          ('presupuesto_partidas', 'insertar', 'insert into public.presupuesto_partidas (presupuesto_id) values ($1)', f_presupuesto),
          ('presupuesto_partidas', 'editar', 'update public.presupuesto_partidas set orden = orden where id = $1', f_partida),
          ('presupuesto_partidas', 'borrar', 'delete from public.presupuesto_partidas where id = $1', f_partida),
          ('presupuestos', 'ver', 'select from public.presupuestos where id = $1', f_presupuesto),
          ('presupuestos', 'insertar', 'insert into public.presupuestos (codigo) values (gen_random_uuid()::text)', null),
          ('presupuestos', 'editar', 'update public.presupuestos set titulo = titulo where id = $1', f_presupuesto),
          ('presupuestos', 'borrar', 'delete from public.presupuestos where id = $1', f_presupuesto),
          ('partidas_tipo_lineas', 'ver', 'select from public.partidas_tipo_lineas where id = $1', f_tipo_linea),
          ('partidas_tipo_lineas', 'insertar', 'insert into public.partidas_tipo_lineas (partida_tipo_id, descripcion, coste_unitario) values ($1, ''x'', 1)', f_tipo),
          ('partidas_tipo_lineas', 'editar', 'update public.partidas_tipo_lineas set orden = orden where id = $1', f_tipo_linea),
          ('partidas_tipo_lineas', 'borrar', 'delete from public.partidas_tipo_lineas where id = $1', f_tipo_linea),
          ('partidas_tipo', 'ver', 'select from public.partidas_tipo where id = $1', f_tipo),
          ('partidas_tipo', 'insertar', 'insert into public.partidas_tipo (codigo) values (''x'')', null),
          ('partidas_tipo', 'editar', 'update public.partidas_tipo set titulo = titulo where id = $1', f_tipo),
          ('partidas_tipo', 'borrar', 'delete from public.partidas_tipo where id = $1', f_tipo),
          ('precios', 'ver', 'select from public.precios where id = $1', f_precio),
          ('precios', 'insertar', 'insert into public.precios (codigo, familia, descripcion) values (gen_random_uuid()::text, ''materiales'', ''x'')', null),
          ('precios', 'editar', 'update public.precios set notas = notas where id = $1', f_precio),
          ('precios', 'borrar', 'delete from public.precios where id = $1', f_precio),

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
  ('trabajadores', array['ajustes', 'control_obra', 'bajas'], 'ajustes'),
  ('tarifas_combustible', array['ajustes', 'control_obra'], 'ajustes'),
  ('perfiles', array['usuarios'], 'usuarios'),
  ('precios', array['base_precios', 'presupuestos'], 'base_precios'),
  ('partidas_tipo', array['base_precios', 'presupuestos'], 'base_precios'),
  ('partidas_tipo_lineas', array['base_precios', 'presupuestos'], 'base_precios'),
  ('presupuestos', array['presupuestos'], 'presupuestos'),
  ('presupuesto_partidas', array['presupuestos'], 'presupuestos'),
  ('presupuesto_lineas', array['presupuestos'], 'presupuestos'),
  ('certificaciones', array['certificaciones'], 'certificaciones'),
  ('partes_horas', array['partes_horas'], 'partes_horas'),
  ('materiales', array['control_obra'], 'control_obra'),
  ('subcontratas', array['control_obra'], 'control_obra'),
  ('alquileres', array['control_obra'], 'control_obra'),
  ('combustible', array['control_obra'], 'control_obra'),
  ('gastos_viaje', array['control_obra'], 'control_obra'),
  ('web_obras', array['galeria'], 'galeria'),
  ('web_fotos', array['galeria'], 'galeria'),
  ('storage_galeria', array['galeria'], 'galeria'),
  ('meses_cerrados', array['control_obra', 'cierre_meses'], 'cierre_meses'),
  ('bajas_documentos', array['bajas'], 'bajas'),
  ('storage_bajas', array['bajas'], 'bajas'),
  ('notas', null, null),
  ('roles', null, null),
  ('permisos_rol', null, null)
),
c as (
  select r.*,
    case
      when r.accion = 'ver_publicada' then true                       -- la web es pública
      when r.rol is null then false                                   -- anon
      when r.tabla in ('roles', 'permisos_rol') then r.accion = 'ver' -- solo lectura
      when r.tabla = 'notas' then r.accion in ('ver_propio', 'insertar') -- cada uno, solo las suyas
      -- Bajas: lo propio, cualquier usuario activo; nadie edita un papel subido
      when r.tabla in ('bajas_documentos', 'storage_bajas')
        and r.accion in ('ver_propio', 'insertar_propio', 'borrar_propio') then r.activo
      when r.tabla = 'bajas_documentos' and r.accion = 'editar' then false
      when r.accion = 'ver_propio' then true
      when r.tabla = 'tarifas_combustible' and r.accion in ('insertar', 'borrar') then false
      when r.tabla = 'meses_cerrados' and r.accion = 'editar' then false -- se cierra o se reabre, no se edita
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
