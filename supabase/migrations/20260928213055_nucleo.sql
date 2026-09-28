-- Núcleo del CRM: roles, permisos por módulo, perfiles, ajustes, clientes y obras.
-- La matriz de permisos es el borrador de docs/PLAN.md B5, pendiente de validar con IMTEX.

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Roles y permisos ---------------------------------------------------------

create table public.roles (
  codigo text primary key,
  nombre text not null
);

insert into public.roles (codigo, nombre) values
  ('gerencia', 'Gerencia'),
  ('oficina_tecnica', 'Oficina técnica'),
  ('administracion', 'Administración'),
  ('encargado', 'Encargado'),
  ('operario', 'Operario');

create table public.permisos_rol (
  rol text not null references public.roles on delete cascade,
  modulo text not null,
  puede_ver boolean not null default false,
  puede_editar boolean not null default false,
  primary key (rol, modulo)
);

-- V = ver · E = editar. Sin fila = sin acceso.
-- «Operario: solo sus partes» se aplica en la política de partes_horas.
insert into public.permisos_rol (rol, modulo, puede_ver, puede_editar)
select rol, modulo, true, permiso = 'E'
from (values
  ('gerencia', 'usuarios', 'E'),
  ('gerencia', 'ajustes', 'E'),
  ('gerencia', 'clientes', 'E'),
  ('gerencia', 'base_precios', 'E'),
  ('gerencia', 'presupuestos', 'E'),
  ('gerencia', 'obras', 'E'),
  ('gerencia', 'control_obra', 'E'),
  ('gerencia', 'partes_horas', 'E'),
  ('gerencia', 'certificaciones', 'E'),
  ('gerencia', 'galeria', 'E'),
  ('oficina_tecnica', 'clientes', 'E'),
  ('oficina_tecnica', 'base_precios', 'E'),
  ('oficina_tecnica', 'presupuestos', 'E'),
  ('oficina_tecnica', 'obras', 'E'),
  ('oficina_tecnica', 'control_obra', 'V'),
  ('oficina_tecnica', 'partes_horas', 'V'),
  ('oficina_tecnica', 'certificaciones', 'E'),
  ('administracion', 'clientes', 'E'),
  ('administracion', 'base_precios', 'V'),
  ('administracion', 'presupuestos', 'V'),
  ('administracion', 'obras', 'E'),
  ('administracion', 'control_obra', 'E'),
  ('administracion', 'partes_horas', 'E'),
  ('administracion', 'certificaciones', 'E'),
  ('administracion', 'galeria', 'E'),
  ('encargado', 'clientes', 'V'),
  ('encargado', 'obras', 'V'),
  ('encargado', 'control_obra', 'E'),
  ('encargado', 'partes_horas', 'E'),
  ('encargado', 'certificaciones', 'V'),
  ('operario', 'partes_horas', 'E')
) as m(rol, modulo, permiso);

create table public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null references public.roles,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.perfiles (rol);

-- Funciones security definer fuera de public, para que la API no las exponga por /rpc.
create schema private;
grant usage on schema private to authenticated;

create function private.tiene_permiso(p_modulo text, p_accion text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles pf
    join public.permisos_rol pr on pr.rol = pf.rol
    where pf.id = (select auth.uid())
      and pf.activo
      and pr.modulo = p_modulo
      and case p_accion
            when 'ver'    then pr.puede_ver or pr.puede_editar
            when 'editar' then pr.puede_editar
            else false
          end
  );
$$;

revoke execute on function private.tiene_permiso(text, text) from public, anon;
grant execute on function private.tiene_permiso(text, text) to authenticated;

-- Ajustes ------------------------------------------------------------------

create table public.categorias_profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio_ord numeric(12,4) not null default 0,
  precio_ext numeric(12,4) not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- Una sola fila: la garantiza la clave primaria booleana.
create table public.tarifas_combustible (
  id boolean primary key default true check (id),
  precio_litro_ref numeric(12,4) not null,
  consumo_furgon_l100 numeric(5,2) not null,
  consumo_camion_l100 numeric(5,2) not null,
  updated_at timestamptz not null default now()
);

-- Valores de partida de referencia/IMTEX_control_obra.html
insert into public.tarifas_combustible (precio_litro_ref, consumo_furgon_l100, consumo_camion_l100)
values (1.45, 8, 26);

create table public.trabajadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_id uuid references public.categorias_profesionales,
  perfil_id uuid unique references public.perfiles on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.trabajadores (categoria_id);

-- Clientes y obras ---------------------------------------------------------

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cif text,
  contacto text,
  email text,
  telefono text,
  direccion text,
  localidad text,
  provincia text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  cliente_id uuid references public.clientes,
  localidad text,
  estado text not null default 'en_ejecucion' check (estado in ('en_ejecucion', 'terminada')),
  gastos_generales_pct numeric(5,2) not null default 13,
  importe_pedido numeric(12,2) not null default 0,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.obras (cliente_id);

-- updated_at ---------------------------------------------------------------

create trigger set_updated_at before update on public.perfiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categorias_profesionales
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tarifas_combustible
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.trabajadores
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.obras
  for each row execute function public.set_updated_at();

-- RLS ----------------------------------------------------------------------
-- Solo para authenticated: anon no ve nada. Lectura y escritura en políticas
-- separadas para no duplicar políticas permisivas de select.

alter table public.roles enable row level security;
alter table public.permisos_rol enable row level security;
alter table public.perfiles enable row level security;
alter table public.categorias_profesionales enable row level security;
alter table public.tarifas_combustible enable row level security;
alter table public.trabajadores enable row level security;
alter table public.clientes enable row level security;
alter table public.obras enable row level security;

-- roles y permisos_rol: lectura para montar el menú; se cambian solo por migración
create policy roles_ver on public.roles
  for select to authenticated using (true);
create policy permisos_rol_ver on public.permisos_rol
  for select to authenticated using (true);

-- perfiles: cada uno ve el suyo; gestión con el permiso usuarios
create policy perfiles_ver on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.tiene_permiso('usuarios', 'ver')));
create policy perfiles_insertar on public.perfiles
  for insert to authenticated
  with check ((select private.tiene_permiso('usuarios', 'editar')));
create policy perfiles_editar on public.perfiles
  for update to authenticated
  using ((select private.tiene_permiso('usuarios', 'editar')))
  with check ((select private.tiene_permiso('usuarios', 'editar')));
create policy perfiles_borrar on public.perfiles
  for delete to authenticated
  using ((select private.tiene_permiso('usuarios', 'editar')));

-- clientes
create policy clientes_ver on public.clientes
  for select to authenticated
  using ((select private.tiene_permiso('clientes', 'ver')));
create policy clientes_insertar on public.clientes
  for insert to authenticated
  with check ((select private.tiene_permiso('clientes', 'editar')));
create policy clientes_editar on public.clientes
  for update to authenticated
  using ((select private.tiene_permiso('clientes', 'editar')))
  with check ((select private.tiene_permiso('clientes', 'editar')));
create policy clientes_borrar on public.clientes
  for delete to authenticated
  using ((select private.tiene_permiso('clientes', 'editar')));

-- obras
create policy obras_ver on public.obras
  for select to authenticated
  using ((select private.tiene_permiso('obras', 'ver')));
create policy obras_insertar on public.obras
  for insert to authenticated
  with check ((select private.tiene_permiso('obras', 'editar')));
create policy obras_editar on public.obras
  for update to authenticated
  using ((select private.tiene_permiso('obras', 'editar')))
  with check ((select private.tiene_permiso('obras', 'editar')));
create policy obras_borrar on public.obras
  for delete to authenticated
  using ((select private.tiene_permiso('obras', 'editar')));

-- Ajustes: los leen también quienes llevan el control de obra (precios por hora y coste por km)
create policy categorias_profesionales_ver on public.categorias_profesionales
  for select to authenticated
  using ((select private.tiene_permiso('ajustes', 'ver')) or (select private.tiene_permiso('control_obra', 'ver')));
create policy categorias_profesionales_insertar on public.categorias_profesionales
  for insert to authenticated
  with check ((select private.tiene_permiso('ajustes', 'editar')));
create policy categorias_profesionales_editar on public.categorias_profesionales
  for update to authenticated
  using ((select private.tiene_permiso('ajustes', 'editar')))
  with check ((select private.tiene_permiso('ajustes', 'editar')));
create policy categorias_profesionales_borrar on public.categorias_profesionales
  for delete to authenticated
  using ((select private.tiene_permiso('ajustes', 'editar')));

-- tarifas_combustible: fila única, solo se edita
create policy tarifas_combustible_ver on public.tarifas_combustible
  for select to authenticated
  using ((select private.tiene_permiso('ajustes', 'ver')) or (select private.tiene_permiso('control_obra', 'ver')));
create policy tarifas_combustible_editar on public.tarifas_combustible
  for update to authenticated
  using ((select private.tiene_permiso('ajustes', 'editar')))
  with check ((select private.tiene_permiso('ajustes', 'editar')));

-- trabajadores: además, cada uno ve su propia ficha
create policy trabajadores_ver on public.trabajadores
  for select to authenticated
  using (
    perfil_id = (select auth.uid())
    or (select private.tiene_permiso('ajustes', 'ver'))
    or (select private.tiene_permiso('control_obra', 'ver'))
  );
create policy trabajadores_insertar on public.trabajadores
  for insert to authenticated
  with check ((select private.tiene_permiso('ajustes', 'editar')));
create policy trabajadores_editar on public.trabajadores
  for update to authenticated
  using ((select private.tiene_permiso('ajustes', 'editar')))
  with check ((select private.tiene_permiso('ajustes', 'editar')));
create policy trabajadores_borrar on public.trabajadores
  for delete to authenticated
  using ((select private.tiene_permiso('ajustes', 'editar')));
