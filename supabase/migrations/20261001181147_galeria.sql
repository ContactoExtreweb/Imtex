-- Galería de obras de la web (imtexsl.com), gestionada desde el CRM.
-- Los visitantes de la web (anon) leen solo lo publicado; el CRM entra con el módulo `galeria`.
-- Sobre docs/PLAN.md B4: la portada es la primera foto por `orden` (sin es_portada) y las fotos
-- se publican con su obra (sin publicada por foto).

create table public.web_obras (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null,
  ubicacion text,
  anio text, -- texto: «2025» o «2017-2024»
  servicio text check (servicio in ('impermeabilizacion', 'reparacion_refuerzo', 'resinas', 'otros')),
  resumen text,
  descripcion text,
  destacada boolean not null default false,
  publicada boolean not null default false,
  -- Obra del CRM de la que sale (las obras antiguas de la web no tienen)
  obra_id uuid unique references public.obras on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  -- No se publica sin categoría
  check (not publicada or servicio is not null)
);

create table public.web_fotos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.web_obras on delete cascade,
  -- Ruta en el bucket `galeria`. La miniatura es la misma ruta acabada en `_m.jpg`.
  storage_path text not null unique,
  alt text not null default '',
  ancho integer not null check (ancho > 0),
  alto integer not null check (alto > 0),
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.web_fotos (obra_id, orden);

create trigger set_updated_at before update on public.web_obras
  for each row execute function public.set_updated_at();

-- RLS ----------------------------------------------------------------------

alter table public.web_obras enable row level security;
alter table public.web_fotos enable row level security;

-- Visitantes de la web: solo lo publicado.
-- Ojo: web_obras también tiene obra_id (la obra del CRM); en las subconsultas hay que escribir web_fotos.obra_id.
create policy web_obras_publicas on public.web_obras
  for select to anon using (publicada);
create policy web_fotos_publicas on public.web_fotos
  for select to anon
  using (exists (select 1 from public.web_obras o where o.id = web_fotos.obra_id and o.publicada));

-- CRM: lo publicado lo ve cualquiera con sesión (es público); los borradores, con galeria:ver
create policy web_obras_ver on public.web_obras
  for select to authenticated
  using (publicada or (select private.tiene_permiso('galeria', 'ver')));
create policy web_obras_insertar on public.web_obras
  for insert to authenticated
  with check ((select private.tiene_permiso('galeria', 'editar')));
create policy web_obras_editar on public.web_obras
  for update to authenticated
  using ((select private.tiene_permiso('galeria', 'editar')))
  with check ((select private.tiene_permiso('galeria', 'editar')));
create policy web_obras_borrar on public.web_obras
  for delete to authenticated
  using ((select private.tiene_permiso('galeria', 'editar')));

create policy web_fotos_ver on public.web_fotos
  for select to authenticated
  using (
    (select private.tiene_permiso('galeria', 'ver'))
    or exists (select 1 from public.web_obras o where o.id = web_fotos.obra_id and o.publicada)
  );
create policy web_fotos_insertar on public.web_fotos
  for insert to authenticated
  with check ((select private.tiene_permiso('galeria', 'editar')));
create policy web_fotos_editar on public.web_fotos
  for update to authenticated
  using ((select private.tiene_permiso('galeria', 'editar')))
  with check ((select private.tiene_permiso('galeria', 'editar')));
create policy web_fotos_borrar on public.web_fotos
  for delete to authenticated
  using ((select private.tiene_permiso('galeria', 'editar')));

-- Storage ------------------------------------------------------------------
-- Bucket público: las fotos se sirven por URL sin sesión. Solo JPEG (el CRM comprime y
-- convierte antes de subir) y 5 MB como máximo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galeria', 'galeria', true, 5242880, array['image/jpeg']);

-- Listar y borrar por la API exige poder leer el objeto; subir y borrar, galeria:editar.
-- Sin política de update: las fotos no se sobrescriben.
create policy galeria_ver on storage.objects
  for select to authenticated
  using (bucket_id = 'galeria' and (select private.tiene_permiso('galeria', 'ver')));
create policy galeria_subir on storage.objects
  for insert to authenticated
  with check (bucket_id = 'galeria' and (select private.tiene_permiso('galeria', 'editar')));
create policy galeria_borrar on storage.objects
  for delete to authenticated
  using (bucket_id = 'galeria' and (select private.tiene_permiso('galeria', 'editar')));
