-- Bajas: los papeles de baja que sube cada trabajador (ampliación, fuera de docs/PLAN.md §0).
-- Son datos de salud: el bucket es privado, cada trabajador ve solo lo suyo y lo de los demás
-- exige el módulo `bajas`. Quién subió cada papel y cuándo lo pone la base de datos.

-- Gestionan las bajas gerencia y administración. Otro cargo = otra fila aquí.
insert into public.permisos_rol (rol, modulo, puede_ver, puede_editar)
values ('gerencia', 'bajas', true, true), ('administracion', 'bajas', true, true);

-- Ficha de trabajador enlazada al usuario que llama. Sin ficha, o con el usuario desactivado, null.
create function private.mi_trabajador_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select t.id
  from public.trabajadores t
  join public.perfiles pf on pf.id = t.perfil_id
  where t.perfil_id = (select auth.uid())
    and pf.activo
$$;

revoke execute on function private.mi_trabajador_id() from public, anon;
grant execute on function private.mi_trabajador_id() to authenticated;

-- Una fila por archivo. No se edita: si alguien se equivoca, borra y sube otro.
create table public.bajas_documentos (
  id uuid primary key default gen_random_uuid(),
  -- De quién es el papel. Vale tenga o no usuario: administración puede subirlo en su nombre.
  -- restrict: una ficha con papeles no se borra (se desactiva); así no quedan archivos sueltos.
  trabajador_id uuid not null references public.trabajadores on delete restrict,
  tipo text not null check (tipo in ('baja', 'confirmacion', 'alta', 'otro')),
  comentario text,
  -- Ruta en el bucket `bajas`, siempre dentro de la carpeta del trabajador
  ruta text not null unique,
  nombre_archivo text not null,
  tipo_mime text not null,
  tamano integer not null check (tamano > 0),
  subido_por uuid references public.perfiles on delete set null,
  -- Copia del nombre: el historial sigue diciendo quién fue aunque ese usuario se borre
  subido_por_nombre text not null default '',
  subido_el timestamptz not null default now(),
  check (ruta like trabajador_id::text || '/%')
);
create index on public.bajas_documentos (trabajador_id, subido_el desc);
create index on public.bajas_documentos (subido_por);

-- Quién y cuándo no se pueden falsear desde el navegador: los pone este trigger.
-- Sin sesión (migraciones, pruebas) se respeta lo que venga en la fila.
create function private.sellar_baja()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.subido_por := (select auth.uid());
    new.subido_el := now();
  end if;
  new.subido_por_nombre := coalesce((select pf.nombre from public.perfiles pf where pf.id = new.subido_por), '');
  return new;
end;
$$;

create trigger sellar_baja before insert on public.bajas_documentos
  for each row execute function private.sellar_baja();

-- RLS ----------------------------------------------------------------------

alter table public.bajas_documentos enable row level security;

create policy bajas_documentos_ver on public.bajas_documentos
  for select to authenticated
  using (trabajador_id = (select private.mi_trabajador_id()) or (select private.tiene_permiso('bajas', 'ver')));
create policy bajas_documentos_insertar on public.bajas_documentos
  for insert to authenticated
  with check (trabajador_id = (select private.mi_trabajador_id()) or (select private.tiene_permiso('bajas', 'editar')));
-- El trabajador borra lo que subió él, no lo que administración subió en su nombre
create policy bajas_documentos_borrar on public.bajas_documentos
  for delete to authenticated
  using (
    (subido_por = (select auth.uid()) and trabajador_id = (select private.mi_trabajador_id()))
    or (select private.tiene_permiso('bajas', 'editar'))
  );

-- Quien gestiona las bajas tiene que poder elegir trabajador
drop policy trabajadores_ver on public.trabajadores;
create policy trabajadores_ver on public.trabajadores
  for select to authenticated
  using (
    perfil_id = (select auth.uid())
    or (select private.tiene_permiso('ajustes', 'ver'))
    or (select private.tiene_permiso('control_obra', 'ver'))
    or (select private.tiene_permiso('bajas', 'ver'))
  );

-- Storage ------------------------------------------------------------------
-- Bucket privado: los archivos solo se abren con un enlace firmado que caduca.
-- 10 MB como máximo. Las fotos llegan ya convertidas a JPEG (el CRM las comprime antes de subir).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bajas', 'bajas', false, 10485760, array[
  'image/jpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain'
]);

-- Mismas reglas que la tabla, mirando la carpeta (<trabajador_id>/…). Sin update: no se sobrescribe.
create policy bajas_ver on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bajas'
    and (
      (storage.foldername(name))[1] = (select private.mi_trabajador_id())::text
      or (select private.tiene_permiso('bajas', 'ver'))
    )
  );
create policy bajas_subir on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bajas'
    and (
      (storage.foldername(name))[1] = (select private.mi_trabajador_id())::text
      or (select private.tiene_permiso('bajas', 'editar'))
    )
  );
create policy bajas_borrar on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bajas'
    and (
      (
        owner_id = (select auth.uid())::text
        and (storage.foldername(name))[1] = (select private.mi_trabajador_id())::text
      )
      or (select private.tiene_permiso('bajas', 'editar'))
    )
  );
