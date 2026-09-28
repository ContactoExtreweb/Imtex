# IMTEX · Plan de arranque con Claude Code

> Presupuesto **EXW-2026-IMTEX-01** aceptado el 28/09/2026. Aquí está todo lo necesario para empezar a construir con Claude Code: lo que tienes que dejar preparado tú (Parte A) y lo que tiene que saber Claude Code (Parte B).

**Cómo usarlo**

1. Haz la **Parte A**: administrativo, cuentas, herramientas, material del cliente y preguntas.
2. Crea la carpeta del proyecto, guarda este archivo como `docs/PLAN.md` y copia las dos herramientas de IMTEX en `referencia/`.
3. Abre Claude Code en esa carpeta y lanza los prompts de la **sección B9**, en orden y uno por sesión.

---

## 0. Qué se ha vendido

| # | Proyecto | Quién | Plazo | Importe (IVA incl.) |
|---|---|---|---|---|
| 1 | Web corporativa: rediseño de imtexsl.com + galería de obras autogestionable | Saúl | 4 semanas | 1.500 € |
| 2 | Tienda online (dropshipping) | Pedro | 4–6 semanas | 1.500 € |
| 3 | Programa de gestión (CRM), fase 1: presupuestos y control de obra | Saúl | 10–12 semanas | 3.000 € |
| | **Total** | | | **6.000 €** |

- **Pagos por proyecto:** 40 % al inicio · 30 % en la entrega para revisión · 30 % en la puesta en producción.
- **Servicios opcionales (al mes, + IVA):** mantenimiento de la web 90 €, de la tienda 90 € y del CRM 100 € (alojamiento, copias, actualizaciones, soporte y cambios sobre lo entregado) · redes sociales 200 € (2 redes, 8 publicaciones al mes con diseño y textos, informe mensual).
- **Fuera de alcance:** otros idiomas (EN/FR/AR), textos nuevos y fotografía profesional, **facturación / Verifactu**, funciones del CRM no descritas en la fase 1 (fotos de albaranes, trabajo sin conexión, informes a medida, conexión con contabilidad), migración del correo, publicidad y SEO mensual.
- **Regla de oro:** lo que no esté en este apartado es una ampliación y se presupuesta aparte. Una vez entregado cada proyecto, los cambios van por mantenimiento.

### Calendario orientativo

Los plazos cuentan desde la aceptación y la entrega de contenidos y accesos por parte de IMTEX.

| Semana | Desde | Web | CRM |
|---|---|---|---|
| S1 | 28/09 | Diseño | H0 · análisis y reunión de arranque |
| S2 | 05/10 | Desarrollo + galería | H0 · prototipo navegable |
| S3 | 12/10 | Contenidos y SEO → **entrega para revisión** | H1 · base |
| S4 | 19/10 | Ajustes → **producción** | H1 · base |
| S5–S7 | 26/10 | — | H2 · presupuestos |
| S8–S10 | 16/11 | — | H3 · control de obra → **entrega para revisión** |
| S11 | 07/12 | — | H4 · carga de datos y formación |
| S12 | 14/12 | — | H5 · **producción** |

La tienda (Pedro) va en paralelo: 4–6 semanas desde el arranque.

---

# Parte A · Lo que tienes que hacer tú

## A1. Administrativo

- [ ] Presupuesto firmado por IMTEX, guardado en `docs/presupuesto-aceptado.pdf`.
- [ ] Completar el CIF y el domicilio fiscal de FG Digital: en el presupuesto quedaron como «pendiente».
- [ ] Contrato con IMTEX y **contrato de encargado del tratamiento (RGPD)**, firmado antes de cargar datos personales en el CRM.
- [ ] Facturar el 40 % inicial (IVA incl.): web 600 € · tienda 600 € · CRM 1.200 €.
- [ ] Preguntar si contratan el mantenimiento y las redes sociales.

## A2. Cuentas

Todas con verificación en dos pasos y los accesos en un gestor de contraseñas compartido con Pedro (por ejemplo, Bitwarden, que tiene organización gratuita para 2 personas).

| Servicio | Qué crear | Plan | Notas |
|---|---|---|---|
| GitHub | Repo privado `imtex` en la organización de FG Digital / extreweb | Gratis | Pedro como colaborador |
| Supabase | Organización **IMTEX** con el proyecto `imtex-prod` | Pro, 25 $/mes | Región de la UE (París o Fráncfort). Contraseña de la BD al gestor |
| Supabase | Proyecto `imtex-dev` en vuestra organización gratuita | Free | Se pausa tras 7 días sin uso (ver B10) |
| Netlify | Sitios `imtex-web` e `imtex-crm` en vuestro equipo | Pro, 20 $/mes compartido | Los dos desde el mismo repo |
| Resend | Cuenta para IMTEX | Gratis (3.000 correos al mes, 100 al día) | Dominio de envío en C3 |
| DonDominio | Dominio del CRM, si no se usa `gestion.imtexsl.com` | ~16 €/año | |
| Google Search Console | Propiedad `imtexsl.com` | Gratis | Verificación por DNS |

## A3. Herramientas en tu PC (Windows)

- [ ] **Git for Windows**: <https://git-scm.com/downloads/win>. Claude Code usa su Git Bash.
- [ ] **Node.js LTS** (22 o superior): <https://nodejs.org>
- [ ] **Claude Code** (necesita plan Pro o Max). En PowerShell:

  ```powershell
  irm https://claude.ai/install.ps1 | iex
  claude --version
  claude doctor
  ```

  Si prefieres no usar la terminal, la app de escritorio de Claude también trae Claude Code.
- [ ] **Supabase CLI**: no hace falta instalarla; se usa con `npx supabase …`. Docker solo haría falta para tener Supabase en local, y no lo necesitamos: se trabaja contra `imtex-dev`.
- [ ] Opcional: VS Code y Netlify CLI (`npm i -g netlify-cli`).

## A4. Material que hay que pedir a IMTEX

- [ ] Logo en vector (SVG, AI o PDF), colores corporativos y tipografía, si la tienen.
- [ ] Fotos de obras a máxima resolución (las de la web actual son pequeñas) y, si hay, de equipo, maquinaria e instalaciones.
- [ ] Datos para el aviso legal: razón social, CIF, domicilio y datos del Registro Mercantil. En su plantilla de presupuestos figura el CIF `B06256861`: confírmalo.
- [ ] Accesos: dónde está registrado `imtexsl.com` y quién tiene el panel DNS (la web actual la hizo 9Technology), el hosting actual y dónde está el correo.
- [ ] Permiso para usar los logos de SIKA, Drizoro, Renolit, Soprema, Danosa y Club DIR, y los certificados ISO.
- [ ] Email que recibirá el formulario de contacto.
- [ ] Para el CRM: usuarios con su puesto, categorías profesionales y tarifas reales, tarifas de combustible y obras en curso que haya que cargar.

## A5. Preguntas para la reunión de arranque

**Web**

- ¿Quieren inglés, francés o árabe? No están en el presupuesto; si no, esas URLs redirigen al español.
- «Cubierta ajardinada Mercadona San Telesforo (Madrid, 2025)» sale como rótulo repetido en casi todas las obras de la web actual: ¿es una obra aparte?
- ¿Qué obras destacamos en portada? ¿El dominio va con o sin `www`?

**CRM**

- ¿Quién ve y edita qué? Validar la matriz de la sección B5.
- ¿El encargado ve todas las obras o solo las suyas? ¿Los operarios meten sus horas o las mete el encargado?
- Presupuestos: formato de numeración, estados y quién los aprueba. ¿El precio se congela al añadir la línea (propuesta en B4) o se actualiza con la base de precios?
- ¿La base de precios de la plantilla (120 precios) es la vigente?
- ¿La retención a subcontratas es siempre del 5 %? ¿Se cierran los meses para que no se puedan modificar?
- ¿Dominio nuevo o `gestion.imtexsl.com`?

**Tienda** (la lleva Pedro): productos, proveedor de dropshipping, márgenes, zonas y costes de envío, devoluciones, venta a empresas o a particulares, y dominio.

## A6. Antes de tocar el DNS

- [ ] Apunta los registros actuales de `imtexsl.com`, sobre todo los del correo. En PowerShell:

  ```powershell
  Resolve-DnsName imtexsl.com -Type MX
  Resolve-DnsName imtexsl.com -Type TXT
  ```

- [ ] Guarda una copia de la web Joomla actual: archivos y base de datos o, como mínimo, todo el contenido y las imágenes.
- [ ] En el lanzamiento solo se cambian los registros de la web (A/CNAME). **El MX no se toca.**

---

# Parte B · Para Claude Code

## B1. Estructura del repositorio

```text
imtex/
├── CLAUDE.md                  ← reglas para Claude Code (sección B8)
├── docs/
│   ├── PLAN.md                ← este documento
│   ├── presupuesto-aceptado.pdf
│   └── decisiones.md          ← registro de decisiones: fecha, decisión y motivo
├── referencia/
│   ├── IMTEX_plantilla_presupuestos.html
│   └── IMTEX_control_obra.html
├── supabase/                  ← migraciones, seed y edge functions (compartido)
├── web/                       ← Astro · imtexsl.com + /admin de la galería
└── crm/                       ← React + Vite · programa de gestión
```

La tienda no va en este repo (Parte D). Si quieres reaprovechar código, copia también en `referencia/` la subida de fotos de GuadiCar (compresión y paso de HEIC a JPEG) y el admin de extreweb.es.

## B2. Stack y decisiones cerradas

| Pieza | Decisión |
|---|---|
| Web | Astro 6 + Tailwind + `@astrojs/netlify`. Páginas estáticas; `/obras` y `/admin` se renderizan bajo demanda |
| CRM | React + Vite + TypeScript, React Router, TanStack Query, React Hook Form + Zod, Tailwind + shadcn/ui y Recharts. Instalable como app (PWA), sin modo sin conexión |
| Backend | Supabase: Auth, Postgres con RLS, Storage y Edge Functions. **Un solo proyecto para la web y el CRM**, en la UE |
| Hosting | Netlify: 2 sitios desde el mismo repo, con base `web/` y `crm/` |
| Correo | Resend: SMTP de Supabase Auth y avisos del formulario |
| PDF de presupuestos | Vista de impresión con CSS, como la herramienta actual → «Guardar como PDF» |
| Idioma | Interfaz en español; tablas y columnas en español, `snake_case` y sin tildes |
| No se hace | Facturación/Verifactu, modo sin conexión, idiomas, integraciones contables |

## B3. Variables de entorno

| App | Variables | Dónde |
|---|---|---|
| web | `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env` y Netlify |
| web | `RESEND_API_KEY`, `CONTACTO_EMAIL_DESTINO` | Solo en servidor (endpoint del formulario) |
| crm | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` y Netlify |
| supabase | `RESEND_API_KEY` y la clave secreta | Secrets de las Edge Functions |

La **clave publicable** (antes *anon*) puede ir en el navegador; la **clave secreta** (antes *service_role*) nunca. Los `.env` quedan fuera de git y el `.env.example` siempre al día.

## B4. Modelo de datos

Convenciones: `id uuid` con `gen_random_uuid()`, `created_at`, `updated_at` (trigger) y `created_by` con `auth.uid()`. Importes en `numeric(12,2)`, porcentajes en `numeric(5,2)` y costes unitarios en `numeric(12,4)`. El mes de imputación se guarda como `date` (día 1) y se muestra como «septiembre-26».

**Web · galería**

| Tabla | Campos principales |
|---|---|
| `web_obras` | slug (único), titulo, ubicacion, anio (texto, p. ej. «2017-2024»), servicio (impermeabilizacion · reparacion_refuerzo · resinas · otros), resumen, descripcion, destacada, publicada, orden |
| `web_fotos` | obra_id (opcional), storage_path, alt, ancho, alto, orden, es_portada, publicada |

Bucket `galeria` en Storage: lectura pública; subir, editar y borrar, solo con el permiso `galeria`.

**CRM · núcleo**

| Tabla | Campos principales |
|---|---|
| `roles` | codigo (pk), nombre |
| `permisos_rol` | rol, modulo, puede_ver, puede_editar (pk rol + modulo) |
| `perfiles` | id (= `auth.users.id`), nombre, email, rol, activo |
| `trabajadores` | nombre, categoria_id, perfil_id (si tiene acceso), activo |
| `clientes` | nombre, cif, contacto, email, telefono, direccion, localidad, provincia, notas |
| `obras` | codigo (único), nombre, cliente_id, localidad, estado, gastos_generales_pct (13 por defecto), importe_pedido, presupuesto_id, fecha_inicio, fecha_fin |

**CRM · presupuestos** (sale de `referencia/IMTEX_plantilla_presupuestos.html`)

| Tabla | Campos principales |
|---|---|
| `precios` | codigo, familia (mano_obra · subcontrata · vehiculos · maquinaria · materiales), descripcion, fabricante, unidad, coste, notas, activo |
| `partidas_tipo` y `partidas_tipo_lineas` | codigo, titulo, medicion, cantidad, gg_pct, ben_pct · líneas: precio_id o precio libre, rendimiento, orden |
| `presupuestos` | codigo, titulo, cliente_id, obra_id, contacto, localidad, fecha, validez, forma_pago, plazo, iva_pct (21), gg_pct_def (13), ben_pct_def (6), carta, condiciones, estado (borrador · enviado · aceptado · rechazado) |
| `presupuesto_partidas` | presupuesto_id, orden, codigo, titulo, medicion, cantidad, gg_pct, ben_pct |
| `presupuesto_lineas` | partida_id, orden, precio_id (opcional), descripcion, unidad, coste_unitario (copiado), rendimiento |

Propuesta a validar: el coste se copia al añadir la línea, para que un cambio en la base de precios no altere presupuestos ya enviados, y los borradores tienen un botón «Actualizar con la base de precios». La herramienta actual lee el precio en vivo.

**CRM · control de obra** (sale de `referencia/IMTEX_control_obra.html`)

| Tabla | Campos principales |
|---|---|
| `categorias_profesionales` | nombre, precio_ord, precio_ext, activa |
| `tarifas_combustible` | precio_litro_ref, consumo_furgon_l100, consumo_camion_l100 (una sola fila) |
| `certificaciones` | obra_id, numero, mes, fecha_corte, descripcion, importe_origen (el anterior sale de la certificación previa) |
| `partes_horas` | obra_id, fecha, mes, trabajador_id, categoria_id, horas_ord, precio_ord, horas_ext, precio_ext, dietas, alojamiento |
| `materiales` | obra_id, fecha, mes, proveedor, tipo, documento, concepto, importe |
| `subcontratas` | obra_id, fecha, mes, empresa, documento, concepto, importe, retencion_pct (5) |
| `alquileres` | obra_id, fecha, mes, empresa, documento, concepto, importe |
| `combustible` | obra_id, fecha, mes, tipo_vehiculo (furgon · camion), vehiculo, km, tarifa_km, importe |
| `gastos_viaje` | obra_id, fecha, mes, tipo (dietas · hoteles), tercero, documento, concepto, importe |

Los precios por hora se copian en cada parte, como hace la herramienta. Las sumas por obra y mes se hacen en SQL (vista o RPC), porque la API de Supabase devuelve por defecto un máximo de 1.000 filas por petición.

## B5. Roles y permisos (borrador para validar en el análisis)

V = ver · E = editar · — = sin acceso

| Módulo | Gerencia | Oficina técnica | Administración | Encargado | Operario |
|---|---|---|---|---|---|
| usuarios y ajustes | E | — | — | — | — |
| clientes | E | E | E | V | — |
| base_precios (y partidas tipo) | E | E | V | — | — |
| presupuestos | E | E | V | — | — |
| obras | E | E | E | V | — |
| control_obra (costes) | E | V | E | E | — |
| partes_horas | E | V | E | E | E (solo los suyos) |
| certificaciones | E | E | E | V | — |
| galeria (web) | E | — | E | — | — |

- RLS activado en **todas** las tablas, con políticas que usan `tiene_permiso(modulo, accion)`. El menú se oculta según los permisos, pero la seguridad está en la base de datos.
- Registro público desactivado. Las altas son por invitación, con una Edge Function (`invitar-usuario`) que exige el permiso `usuarios`.
- Antes de cada entrega se prueba cada rol con un usuario de prueba.

Patrón de referencia:

```sql
create or replace function public.tiene_permiso(p_modulo text, p_accion text)
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

alter table public.clientes enable row level security;

create policy clientes_ver on public.clientes
  for select to authenticated
  using ((select public.tiene_permiso('clientes', 'ver')));

create policy clientes_editar on public.clientes
  for all to authenticated
  using ((select public.tiene_permiso('clientes', 'editar')))
  with check ((select public.tiene_permiso('clientes', 'editar')));
```

## B6. Web corporativa

**Rutas**

| Ruta | Contenido |
|---|---|
| `/` | Inicio: propuesta de valor, servicios, obras destacadas, fabricantes y certificados, contacto |
| `/empresa` | Sobre IMTEX |
| `/servicios` y `/servicios/[slug]` | impermeabilizacion · reparacion-y-refuerzo · resinas-epoxi-y-poliuretano · otros-trabajos |
| `/obras` y `/obras/[slug]` | Galería: solo lo publicado, renderizado bajo demanda (sale al momento, sin volver a desplegar) |
| `/contacto` | Formulario, mapa y datos |
| `/aviso-legal`, `/privacidad`, `/cookies` | Con los datos reales de IMTEX |
| `/admin` | Login y gestión de la galería (noindex) |

**Panel `/admin`:** crear y editar obras, subir varias fotos a la vez desde el móvil, comprimirlas en el navegador (lado largo ~2.000 px, calidad ~80 %, HEIC → JPEG), ordenarlas, elegir portada y botón **Publicar / Despublicar**.

**Formulario:** honeypot, tiempo mínimo y validación; envío con Resend al email de IMTEX.

**SEO:** title y description por página, Open Graph, sitemap, `robots.txt`, JSON-LD (LocalBusiness con dirección y teléfono, Service por servicio, BreadcrumbList), canónicas y un solo dominio (con o sin `www`; el otro redirige). Lighthouse en móvil ≥ 90.

**Contenido de partida** (de la web actual): empresa de Villanueva de la Serena con más de 25 años de experiencia; impermeabilización; reparación de estructuras de hormigón con morteros según UNE-EN 1504 y refuerzo con fibra de carbono; resinas epoxi y poliuretano; aplicadores homologados de SIKA, Drizoro, Renolit, Soprema y Danosa; miembros del Club DIR; ISO 9001 e ISO 14001 certificadas por OCA Global; clasificación de empresa C041, C072, E074 y G063. Contacto: Pol. Ind. Cagancha, parcela 31, 06700 Villanueva de la Serena · 924 844 202 · imtex@imtexsl.com · YouTube `@imtexsl` · LinkedIn `/company/imtexsl`.

**Las 22 obras de referencia.** La URL antigua es `/index.php/obras/<antiguo>`, y la nueva, `/obras/<nuevo>`. El texto completo y las fotos se sacan de cada página actual.

| Nuevo slug | Antiguo | Obra | Lugar | Año | Trabajo |
|---|---|---|---|---|---|
| inyeccion-sifones-orellana | inyeccion | Inyección de sifones | Orellana (Badajoz) | 2025 | Inyección de mortero en el encuentro de sifones con solera de hormigón |
| balsa-pead-badajoz | balsapead | Balsa PEAD 1,50 mm | Badajoz | 2025 | Impermeabilización de balsa de riego con lámina de PEAD |
| etap-torrelaguna | torrelaguna | E.T.A.P. Torrelaguna | Madrid | 2024 | Reparación, protección e impermeabilización de tres decantadores |
| obramat-carnaxide-lisboa | carnaxide | Obramat Carnaxide | Lisboa | 2024 | Regularización y refuerzo de forjado con laminado de fibra de carbono |
| bodegas-williams-humbert | williamshumbert | Bodegas Williams & Humbert | Cádiz | 2017-2024 | Cubierta singular con espuma de poliuretano y poliurea en caliente |
| canal-de-las-aves | aves | Canal de las Aves | Madrid | 2023 | Reparación, refuerzo con tejido de carbono y protección de tres estructuras |
| estructuras-don-benito-medellin | donbenito | Estructuras Don Benito / Medellín | Badajoz | 2023 | Reparación y tratamiento anticarbonatación de dos estructuras |
| canales-acequias-pead | canalesyacequiaspead | Canales y acequias | Badajoz | 2010-actualidad | Impermeabilización de canales y acequias con lámina de PEAD |
| cetarsa-caceres | cetarsa | CETARSA Talayuela, Navalmoral y Coria | Cáceres | 2012-2022 | Cubiertas con membrana de poliurea proyectada en caliente |
| parking-salamanca | salamanca | Refuerzo parking Salamanca | Salamanca | 2022 | Reconstrucción y refuerzo con laminado de carbono tras incendio |
| deposito-plasencia | coria | Depósito Plasencia | Cáceres | 2021 | Depósito de agua potable con lámina de PVC |
| cc-plaza-mayor-malaga | malaga | C. C. Plaza Mayor | Málaga | 2021 | Cubierta de parking con poliurea en caliente y acabado transitable |
| universidad-linares | linares | Universidad de Linares | Jaén | 2020 | Cubierta de parking con poliurea en caliente y acabado transitable |
| transvase-tajo-segura | tajosegura | Transvase Tajo-Segura | Cuenca | 2016-2019 | Anticarbonatación e impermeabilización de acueductos con poliurea |
| presa-horcajo | horcajo | Presa Horcajo | Hervás (Cáceres) | 2017 | Reparación, tratamiento de juntas e impermeabilización con mortero |
| balsa-la-caldereta-la-palma | lapalma | Balsa La Caldereta | La Palma | 2017 | Balsa de riego con lámina de PVC |
| mercadona-asura | asura | Mercadona Asura | Madrid | 2016 | Refuerzo de varias plantas con mortero de alta resistencia y tejido de carbono |
| viaducto-casatejada | casatejada | Viaducto Casatejada | Cáceres | 2016 | Impermeabilización con lámina asfáltica para tráfico rodado |
| jardines-de-la-sierra-cordoba | rcordoba | Edificio Jardines de la Sierra | Córdoba | 2015 | Reparación y refuerzo con fibra de carbono tras incendio |
| central-nuclear-almaraz | almaraz | Central Nuclear de Almaraz | Cáceres | 2011-2012 | Cubiertas con membrana de poliurea proyectada en caliente |
| aeropuerto-sevilla | aenasevilla | Aeropuerto de Sevilla | Sevilla | 2011 | Cubiertas planas e inclinadas con poliurea en caliente |
| aeropuerto-bilbao | aenabilbao | Aeropuerto de Bilbao | Bilbao | 2010 | Cubierta metálica con membrana de poliurea en caliente |

**Redirecciones 301** (`web/public/_redirects`): una línea por cada obra de la tabla anterior, más estas. Antes de lanzar, confírmalas rastreando la web actual y el informe de páginas de Search Console.

```text
/index.php                                        /                                        301
/index.php/sobre-nosotros                         /empresa                                 301
/index.php/servicios                              /servicios                               301
/index.php/servicios/impermeabilizacion           /servicios/impermeabilizacion            301
/index.php/servicios/reparaciones                 /servicios/reparacion-y-refuerzo         301
/index.php/servicios/resinas-epoxi-y-poliuretano  /servicios/resinas-epoxi-y-poliuretano   301
/index.php/servicios/otros-trabajos               /servicios/otros-trabajos                301
/index.php/obras                                  /obras                                   301
# Enlaces del pie heredados de la plantilla Joomla
/index.php/about-growth                           /empresa                                 301
/index.php/footer-services                        /servicios                               301
/index.php/gallery-footer                         /obras                                   301
/index.php/footer-news                            /contacto                                301
/index.php/support-forum                          /aviso-legal                             301
/index.php/video-tutorials                        /privacidad                              301
/index.php/documentation                          /cookies                                 301
/index.php/download-growth                        /                                        301
# Idiomas (no incluidos) y cualquier otra URL antigua, al final
/index.php/en/*                                   /                                        301
/index.php/fr/*                                   /                                        301
/index.php/ar/*                                   /                                        301
/index.php/*                                      /                                        301
```

## B7. Programa de gestión: hitos y criterios de aceptación

| Hito | Semanas | Qué incluye | Terminado cuando |
|---|---|---|---|
| H0 · Análisis y prototipo | S1–S2 | Reunión de arranque (A5), matriz de permisos (B5) validada y prototipo navegable con datos de ejemplo en un deploy preview | IMTEX da el visto bueno por escrito (`docs/analisis.md`) |
| H1 · Base | S3–S4 | Login, recuperar contraseña e invitaciones; perfiles, roles y RLS; menú según permisos; clientes, obras y ajustes (categorías y tarifas de combustible) | Cada rol de prueba ve y edita solo lo suyo |
| H2 · Presupuestos | S5–S7 | Base de precios (importa los 120 de la plantilla y limpia las filas vacías) con filtros por familia y texto; partidas tipo; presupuesto con partidas, líneas y % de GG y beneficio; resumen; vista de impresión con carta, relación de partidas, condiciones y firma de IMTEX; duplicar; estados; crear la obra desde un presupuesto aceptado | Los totales coinciden al céntimo con la herramienta actual |
| H3 · Control de obra | S8–S10 | Varias obras, meses, certificaciones, partes de horas, materiales, subcontratas con retención, alquileres, combustible, dietas y hoteles; matriz mensual y acumulados a origen; KPIs; gráficos; comparativa de lo presupuestado con lo real | Los datos de ejemplo de la herramienta dan los mismos resultados → **entrega para revisión** |
| H4 · Carga y formación | S11 | Datos reales (precios, categorías, obras en curso), usuarios invitados, guía rápida por perfil y formación | Cada perfil hace su trabajo sin ayuda |
| H5 · Producción | S12 | Lista de la sección C2 | **Puesta en producción** |

**Fórmulas que hay que respetar** (están en las herramientas actuales)

Presupuesto (`partidaCostes` y `sumaResumen`):

- Coste directo de la partida = Σ (rendimiento × coste unitario).
- GG = coste directo × gg_pct / 100.
- Beneficio = (coste directo + GG) × ben_pct / 100.
- Importe de la partida = coste directo + GG + beneficio.
- Base = Σ (importe de la partida × cantidad) · IVA = base × iva_pct / 100 · total = base + IVA.

Control de obra (`getMonthConsolidated` y `computeMonthlyData`), por obra y mes:

- Certificación del mes = importe a origen − importe a origen de la certificación anterior.
- Mano de obra = Σ (horas_ord × precio_ord + horas_ext × precio_ext).
- Dietas = dietas de los partes + gastos de tipo dietas · hoteles = alojamiento de los partes + gastos de tipo hoteles.
- Estructura = certificación del mes × gastos_generales_pct / 100, redondeada a 2 decimales.
- Costes directos = mano de obra + subcontratas + materiales + alquileres + combustible. En subcontratas cuenta el importe; la retención solo cambia el líquido a pagar.
- Costes con estructura = costes directos + dietas + hoteles + estructura.
- Resultado = certificación − costes con estructura · margen = resultado / certificación × 100.
- A origen: sumas acumuladas, y margen a origen = resultado acumulado / certificado acumulado × 100.
- Pendiente de pedido = máx(0, importe_pedido − certificado a origen) · avance = certificado a origen / importe_pedido × 100.
- Coste por km = precio_litro_ref × consumo (L/100 km) / 100.

Los datos de ejemplo de `IMTEX_control_obra.html` (una obra en Valencia) son ficticios: sirven como caso de prueba y no se migran.

## B8. CLAUDE.md (va en la raíz del repo)

```markdown
# IMTEX · web corporativa + programa de gestión

Cliente: IMTEX S.L. (impermeabilizaciones, Villanueva de la Serena).
Proveedor: FG Digital (marca extreweb). Plan, alcance y especificación: `docs/PLAN.md`.
Las herramientas de `referencia/` son la especificación funcional de la fase 1 del CRM.

## Estructura
- `web/`: Astro + Tailwind en Netlify. imtexsl.com y `/admin` de la galería.
- `crm/`: React + Vite + TypeScript en Netlify. Programa de gestión privado (noindex).
- `supabase/`: migraciones, seed y edge functions. Un único proyecto Supabase para web y CRM.

## Comandos
- Web: `cd web && npm run dev` · `npm run build`
- CRM: `cd crm && npm run dev` · `npm run build` · `npm test`
- Nueva migración: `npx supabase migration new <nombre>`
- Aplicar migraciones: `npx supabase db push` (enlazado a imtex-dev; producción solo si se pide)
- Tipos: `npx supabase gen types typescript --linked > crm/src/lib/database.types.ts` (y copia en `web/src/lib/`)

## Reglas
1. Alcance: solo lo de `docs/PLAN.md` §0. Si algo no está, avisa de que es una ampliación antes de hacerlo.
2. Nada de facturación ni Verifactu: el CRM no emite facturas.
3. RLS activado en todas las tablas, con permisos vía `public.tiene_permiso(modulo, accion)`. La clave secreta de Supabase nunca va en código del navegador. Registro público desactivado.
4. Cambios de base de datos, siempre con migración en `supabase/migrations`, nunca a mano en el panel. Después, regenera los tipos.
5. Nombres en español, snake_case y sin tildes. Importes en numeric(12,2).
6. Los cálculos de presupuestos y control de obra van en funciones puras (`crm/src/lib/calculos`) con tests de Vitest, y deben coincidir al céntimo con `referencia/*.html`.
7. Sumas de muchas filas, en SQL (vista o RPC): la API devuelve por defecto un máximo de 1.000 filas por petición.
8. Interfaz en español con formato es-ES (1.234,56 €; dd/mm/aaaa). Diseño pensado primero para el móvil; se prueba en iPhone.
9. Las fotos se comprimen en el navegador antes de subirlas; HEIC → JPEG.
10. Para cambios grandes, primero un plan. Antes de dar algo por terminado: build, tests y lint.
11. Commits pequeños con mensajes en español. No añadas dependencias sin motivo.
12. Secretos solo en `.env` (fuera de git); `.env.example` al día.
13. Cada decisión relevante se apunta en `docs/decisiones.md` (fecha, decisión y motivo).
```

## B9. Prompts de arranque

Uno por sesión y en orden. En los grandes, usa el modo plan (Shift+Tab) y revisa el plan antes de aceptarlo. Usa `/clear` al cambiar de tarea.

1. **Esqueleto del repo**
   > Lee `docs/PLAN.md` entero. Crea la estructura de B1, el `CLAUDE.md` con el contenido de B8, el `.gitignore`, un `.env.example` por app según B3 y `docs/decisiones.md`. Crea `web/` con Astro, Tailwind y el adaptador de Netlify, y `crm/` con Vite, React, TypeScript, Tailwind, shadcn/ui y Vitest. Ejecuta `npx supabase init`. Añade un `netlify.toml` a cada app según B10 (el del CRM, con la redirección para SPA y la cabecera `X-Robots-Tag: noindex, nofollow`). Todavía no crees tablas. Comprueba que las dos apps compilan y haz commit.

2. **Base de datos: núcleo**
   > Con B4 y B5, crea la migración de roles, permisos_rol, perfiles, trabajadores, tiene_permiso, clientes, obras, categorias_profesionales y tarifas_combustible, con RLS y políticas en todas las tablas, y un seed con los roles y la matriz de permisos. Aplícala en dev, genera los tipos y crea un script que compruebe lo que ve y edita cada rol.

3. **Acceso al CRM**
   > Login, recuperación de contraseña, la Edge Function `invitar-usuario`, el layout con el menú según permisos y las pantallas de clientes, obras y ajustes.

4. **Galería web**
   > Tablas `web_obras` y `web_fotos`, bucket `galeria` con sus políticas, el panel `/admin` de B6 y las páginas `/obras` renderizadas bajo demanda.

5. **Contenidos de la web**
   > Lee las páginas actuales de imtexsl.com (empresa, servicios y las 22 obras de B6). Redacta los textos nuevos a partir de ellas, crea el seed de las 22 obras con sus fotos y genera `web/public/_redirects`.

6. **Presupuestos**
   > Estudia `referencia/IMTEX_plantilla_presupuestos.html` (`partidaCostes`, `sumaResumen` y `EMBEDDED_DATA`). Crea las tablas de B4, las pantallas, la importación de los 120 precios (limpiando las filas vacías) y la vista de impresión con el formato actual. Los tests deben dar los mismos totales que la herramienta.

7. **Control de obra**
   > Estudia `referencia/IMTEX_control_obra.html` (`getMonthConsolidated`, `computeMonthlyData` y `DEFAULT_STORE`). Crea las tablas de B4, una vista SQL con las sumas por obra y mes, las pantallas, los KPIs, los gráficos y la comparativa con el presupuesto. Test: con `DEFAULT_STORE` deben salir los mismos resultados que en la herramienta.

8. **Producción**
   > Recorre la Parte C de `docs/PLAN.md` y dime qué falta.

**Supabase MCP** (opcional, solo contra dev): deja que Claude Code consulte la base de datos. En la terminal, dentro del repo:

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<REF_DE_IMTEX_DEV>"
```

Después, en Claude Code, escribe `/mcp` → supabase → *Authenticate*. Nunca lo conectes a producción; si alguna vez hace falta, que sea en solo lectura (`&read_only=true`).

## B10. Git, Netlify y Supabase Auth

- `main` es producción. Trabaja en ramas (`feat/galeria`, `feat/presupuestos`…) y abre una PR: Netlify crea un deploy preview para enseñárselo a IMTEX.
- Netlify: `imtex-web` con base `web/` e `imtex-crm` con base `crm/`, cada uno con sus variables de entorno.
- En el `netlify.toml` de cada app, `ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- ."`, para no construir la app que no ha cambiado: cada deploy a producción gasta 15 créditos.
- Supabase Auth → URL Configuration: la *Site URL* es el dominio del CRM. En *Redirect URLs* van `http://localhost:*`, `https://imtexsl.com/admin/**` y los deploy previews (`https://*--imtex-crm.netlify.app/**` y `https://*--imtex-web.netlify.app/**`).
- `imtex-dev` es gratuito y se pausa tras 7 días sin actividad: reactívalo desde el panel o programa un keepalive con GitHub Actions.
- Opcional: una GitHub Action en cada PR que pase lint, typecheck y tests.

---

# Parte C · Puesta en producción

## C1. Web

- [ ] Textos y fotos validados por IMTEX; legales con los datos reales.
- [ ] Todas las URLs antiguas redirigen y ninguna da 404.
- [ ] Formulario probado: llega el email y el antispam funciona.
- [ ] Lighthouse en móvil ≥ 90 y revisión en iPhone.
- [ ] DNS: solo los registros de la web; MX intacto; SSL activo; `www` y sin `www` redirigidos a uno.
- [ ] Search Console: sitemap enviado e inspección de las URLs principales.

## C2. CRM

- [ ] Dominio y SSL, con `X-Robots-Tag: noindex, nofollow` en todas las respuestas. No lo bloquees en `robots.txt`: Google tiene que poder leer el noindex.
- [ ] Registro público desactivado; invitaciones y recuperación de contraseña probadas con el SMTP de Resend.
- [ ] Prueba de permisos por rol superada y Security Advisor de Supabase sin avisos.
- [ ] Copias de seguridad: las diarias de Supabase Pro (7 días) no incluyen los archivos de Storage. Añade una copia externa semanal de la base de datos y de Storage (GitHub Action).
- [ ] Contrato de encargado del tratamiento firmado antes de cargar datos personales.
- [ ] Formación hecha y guía rápida por perfil entregada.

## C3. Correo transaccional (Resend)

- [ ] Dominio de envío en un subdominio (por ejemplo, `avisos.imtexsl.com`) con SPF y DKIM, sin tocar el correo principal.
- [ ] Supabase Auth → SMTP: servidor `smtp.resend.com`, puerto 465, usuario `resend` y la API key como contraseña.
- [ ] Plantillas de invitación y recuperación de contraseña en español.

## C4. Cobros por hito (IVA incl.)

| Proyecto | Inicio (40 %) | Entrega para revisión (30 %) | Producción (30 %) |
|---|---|---|---|
| Web | 600 € · al firmar | 450 € · S3 | 450 € · S4 |
| Tienda | 600 € · al firmar | 450 € · según Pedro | 450 € · según Pedro |
| CRM | 1.200 € · al firmar | 900 € · S10 | 900 € · S12 |

---

# Parte D · Tienda online (Pedro)

- **Plataforma:** Shopify o WooCommerce; a este precio, no a medida. La cuota y las comisiones corren a cargo de IMTEX y la gestiona FG Digital.
- **Alcance vendido:** diseño y configuración; un proveedor de dropshipping (productos, precios, stock y envío automático de los pedidos); hasta 100 productos; pago con tarjeta; envíos e IVA; textos legales de venta (con el desistimiento de 14 días); pruebas y formación.
- **Facturas de las ventas:** no las emite la tienda. Van por el programa de facturación de IMTEX (Verifactu).
- **Dominio:** `tienda.imtexsl.com` o el que elijan.
