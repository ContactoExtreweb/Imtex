-- Partes de trabajo en papel (ampliación, fuera de docs/PLAN.md §0): la hoja diaria que la cuadrilla
-- rellena a mano (obra, fecha, trabajadores con sus horas y extras, vehículo y km, trabajos, material).
-- Llega como foto por WhatsApp o subida desde el CRM, la lee una IA y, ya confirmada, se apunta en el
-- control de obra: una línea de partes_horas por trabajador y una de combustible por el vehículo.
-- La foto se guarda siempre: es el justificante (y el registro de calidad de la ISO 9001).

-- Teléfono de WhatsApp: identifica quién manda el parte. Solo cifras y con el prefijo del país,
-- como lo da WhatsApp (34600111222). Un trabajador con teléfono puede mandar partes.
alter table public.trabajadores add column telefono text unique check (telefono ~ '^[1-9][0-9]{7,14}$');

create table public.partes_trabajo (
  id uuid primary key default gen_random_uuid(),
  -- leyendo: la IA lo está leyendo (WhatsApp) · por_confirmar: esperando a quien lo mandó ·
  -- revisar: lo tiene que mirar administración · apuntado: ya está en el control de obra · descartado
  estado text not null default 'revisar'
    check (estado in ('leyendo', 'por_confirmar', 'revisar', 'apuntado', 'descartado')),
  origen text not null default 'crm' check (origen in ('whatsapp', 'crm')),
  -- Ruta de la foto en el bucket `partes`
  foto text not null unique,

  -- Quién lo mandó por WhatsApp (su ficha y su número) o quién lo subió desde el CRM
  enviado_por uuid references public.trabajadores on delete set null,
  telefono text,
  subido_por uuid default auth.uid() references public.perfiles on delete set null,
  -- Meta reintenta los avisos que no se contestan a tiempo: así un mensaje no crea dos partes
  whatsapp_mensaje_id text unique,
  -- El resumen que se le mandó para confirmar (para saber a qué parte responde) y cuándo pidió corregir
  whatsapp_resumen_id text,
  correccion_pedida_el timestamptz,

  -- Lo que pone la hoja. Todo opcional: es un borrador hasta que se apunta.
  obra_id uuid references public.obras,
  fecha date,
  -- Un elemento por fila de la hoja: {nombre (lo escrito), trabajador_id, horas_ord, horas_ext}
  lineas jsonb not null default '[]' check (jsonb_typeof(lineas) = 'array'),
  vehiculo text,
  tipo_vehiculo text check (tipo_vehiculo in ('furgon', 'camion')),
  km_salida numeric(10,1),
  km_llegada numeric(10,1),
  salida_nave time,
  llegada_obra time,
  salida_obra time,
  llegada_nave time,
  trabajos text,
  material_retirado text,
  material_utilizado text,
  material_devuelto text,
  instrucciones_calidad text,
  medio_ambiente text,

  -- La lectura de la IA tal cual (también cliente, obra y localidad como vienen escritos)
  -- y lo que hay que mirar: dudas de la lectura, nombres sin casar, horas ya apuntadas…
  lectura jsonb,
  avisos text[] not null default '{}',

  confirmado_el timestamptz,
  apuntado_el timestamptz,
  apuntado_por uuid references public.perfiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (origen = 'crm' or (telefono is not null and whatsapp_mensaje_id is not null))
);
create index on public.partes_trabajo (estado, created_at desc);
create index on public.partes_trabajo (telefono, estado);
create index on public.partes_trabajo (obra_id);
create index on public.partes_trabajo (enviado_por);
create index on public.partes_trabajo (subido_por);
create index on public.partes_trabajo (apuntado_por);

create trigger set_updated_at before update on public.partes_trabajo
  for each row execute function public.set_updated_at();

-- Los apuntes saben de qué parte salieron. Un parte apuntado no se borra (ni se edita: ver RLS).
alter table public.partes_horas add column parte_trabajo_id uuid references public.partes_trabajo on delete restrict;
alter table public.combustible add column parte_trabajo_id uuid references public.partes_trabajo on delete restrict;
create index on public.partes_horas (parte_trabajo_id);
create index on public.combustible (parte_trabajo_id);

-- RLS: el mismo módulo que los partes de horas. Por la API no se borra: se descarta.
-- Lo que llega por WhatsApp lo escribe la Edge Function con la clave secreta (sin RLS).

alter table public.partes_trabajo enable row level security;

create policy partes_trabajo_ver on public.partes_trabajo
  for select to authenticated
  using ((select private.tiene_permiso('partes_horas', 'ver')));
create policy partes_trabajo_insertar on public.partes_trabajo
  for insert to authenticated
  with check ((select private.tiene_permiso('partes_horas', 'editar')) and origen = 'crm');
-- Apuntado, queda fijo: lo que valga a partir de ahí son sus apuntes del control de obra
create policy partes_trabajo_editar on public.partes_trabajo
  for update to authenticated
  using ((select private.tiene_permiso('partes_horas', 'editar')) and estado <> 'apuntado')
  with check ((select private.tiene_permiso('partes_horas', 'editar')));

-- Apuntar: de la hoja al control de obra, todo o nada -----------------------------------------
-- Security invoker: quien llama necesita permiso para crear partes de horas y combustible, y los
-- triggers del cierre de meses siguen mandando. Lo llaman el CRM y la Edge Function de WhatsApp.

create function public.apuntar_parte(p_parte uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  p public.partes_trabajo;
  l record;
  t public.trabajadores;
  c public.categorias_profesionales;
  tf public.tarifas_combustible;
  v_mes date;
  v_horas numeric;
  v_km numeric;
  v_tarifa numeric;
begin
  select * into p from public.partes_trabajo where id = p_parte for update;
  if not found then
    raise exception 'No se encuentra el parte, o no tienes permiso para apuntarlo.';
  end if;
  if p.estado = 'apuntado' then
    raise exception 'Este parte ya está apuntado.';
  end if;
  if p.estado = 'descartado' then
    raise exception 'Este parte está descartado. Recupéralo antes de apuntarlo.';
  end if;
  if p.obra_id is null then
    raise exception 'Falta la obra.';
  end if;
  if p.fecha is null then
    raise exception 'Falta la fecha.';
  end if;
  if p.fecha > current_date then
    raise exception 'La fecha del parte (%) es posterior a hoy.', to_char(p.fecha, 'DD/MM/YYYY');
  end if;
  if jsonb_array_length(p.lineas) = 0 then
    raise exception 'El parte no tiene ningún trabajador.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p.lineas) as x(trabajador_id uuid)
    where x.trabajador_id is not null
    group by x.trabajador_id having count(*) > 1
  ) then
    raise exception 'Hay un trabajador repetido en el parte.';
  end if;
  v_mes := date_trunc('month', p.fecha)::date;

  -- Una línea de partes_horas por trabajador, con los precios de su categoría (como el CRM)
  for l in
    select * from jsonb_to_recordset(p.lineas) as x(nombre text, trabajador_id uuid, horas_ord numeric, horas_ext numeric)
  loop
    if l.trabajador_id is null then
      raise exception 'Falta elegir quién es «%».', coalesce(nullif(trim(l.nombre), ''), 'una de las filas');
    end if;
    select * into t from public.trabajadores where id = l.trabajador_id;
    if not found then
      raise exception 'Uno de los trabajadores del parte ya no existe. Elígelo de nuevo.';
    end if;
    select * into c from public.categorias_profesionales where id = t.categoria_id;
    if not found then
      raise exception '% no tiene categoría, y de ella salen los precios por hora. Asígnasela en Ajustes → Trabajadores.', t.nombre;
    end if;
    v_horas := coalesce(l.horas_ord, 0) + coalesce(l.horas_ext, 0);
    if coalesce(l.horas_ord, 0) < 0 or coalesce(l.horas_ext, 0) < 0 or v_horas = 0 then
      raise exception 'Faltan las horas de %.', t.nombre;
    end if;
    -- Una mala lectura (un 8 que se lee 18) no llega a los costes
    if v_horas > 16 then
      raise exception 'Revisa las horas de %: salen % en un día.', t.nombre, v_horas;
    end if;
    insert into public.partes_horas (obra_id, fecha, mes, trabajador_id, operario, categoria_id,
                                     horas_ord, precio_ord, horas_ext, precio_ext, parte_trabajo_id)
    values (p.obra_id, p.fecha, v_mes, t.id, t.nombre, c.id,
            coalesce(l.horas_ord, 0), c.precio_ord, coalesce(l.horas_ext, 0), c.precio_ext, p.id);
  end loop;

  -- El vehículo, si se apuntaron los km: km recorridos × coste por km de la tarifa
  if p.km_salida is not null or p.km_llegada is not null then
    if p.km_salida is null or p.km_llegada is null then
      raise exception 'Faltan los km de salida o los de llegada (si no hubo vehículo, borra los dos).';
    end if;
    v_km := p.km_llegada - p.km_salida;
    if v_km <= 0 then
      raise exception 'Los km de llegada (%) tienen que ser más que los de salida (%).', p.km_llegada, p.km_salida;
    end if;
    if v_km > 1500 then
      raise exception 'Revisa los km: salen % en un día.', v_km;
    end if;
    select * into tf from public.tarifas_combustible;
    if not found then
      raise exception 'No se han podido leer las tarifas de combustible.';
    end if;
    -- Igual que costeKm (crm/src/lib/calculos/combustible.ts): litro × consumo / 100, a 3 decimales
    v_tarifa := round(tf.precio_litro_ref
                      * case when p.tipo_vehiculo = 'camion' then tf.consumo_camion_l100 else tf.consumo_furgon_l100 end
                      / 100, 3);
    insert into public.combustible (obra_id, fecha, mes, tipo_vehiculo, vehiculo, km, tarifa_km, importe, parte_trabajo_id)
    values (p.obra_id, p.fecha, v_mes, coalesce(p.tipo_vehiculo, 'furgon'), p.vehiculo, v_km, v_tarifa,
            round(v_km * v_tarifa, 2), p.id);
  end if;

  update public.partes_trabajo
     set estado = 'apuntado', apuntado_el = now(), apuntado_por = (select auth.uid())
   where id = p.id;
end;
$$;

revoke execute on function public.apuntar_parte(uuid) from public, anon;
grant execute on function public.apuntar_parte(uuid) to authenticated, service_role;

-- Storage ------------------------------------------------------------------
-- Bucket privado: las fotos se abren con un enlace firmado. Sin update ni delete: son justificantes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partes', 'partes', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

create policy partes_ver on storage.objects
  for select to authenticated
  using (bucket_id = 'partes' and (select private.tiene_permiso('partes_horas', 'ver')));
create policy partes_subir on storage.objects
  for insert to authenticated
  with check (bucket_id = 'partes' and (select private.tiene_permiso('partes_horas', 'editar')));
