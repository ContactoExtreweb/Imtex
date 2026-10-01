-- Notas rápidas de la portada: cada usuario tiene las suyas y nadie más las ve.
-- No van por módulos de permisos_rol: el dueño es quien las escribe.

create table public.notas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null default auth.uid() references public.perfiles on delete cascade,
  texto text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.notas (perfil_id);

create trigger set_updated_at before update on public.notas
  for each row execute function public.set_updated_at();

alter table public.notas enable row level security;

create policy notas_ver on public.notas
  for select to authenticated using (perfil_id = (select auth.uid()));
create policy notas_insertar on public.notas
  for insert to authenticated with check (perfil_id = (select auth.uid()));
create policy notas_editar on public.notas
  for update to authenticated
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));
create policy notas_borrar on public.notas
  for delete to authenticated using (perfil_id = (select auth.uid()));
