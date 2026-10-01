# Estado del proyecto IMTEX

Actualizado el 01/10/2026. Qué está hecho, qué falta y cómo seguir desde otro ordenador.
El plan completo está en [PLAN.md](PLAN.md) y el porqué de cada decisión en [decisiones.md](decisiones.md).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Código | GitHub, `ContactoExtreweb/Imtex` (privado) |
| Rama con todo el trabajo | **`feat/control-obra`** |
| `main` | Llega hasta Presupuestos. Control de obra se fusiona cuando Saúl lo pruebe |
| Base de datos de desarrollo | Supabase, proyecto `imtex-dev`, ref `vrhpxwnzthenjxubagys` (Fráncfort) |
| Base de datos de producción | Sin crear todavía |
| Usuarios de prueba en dev | `saul@prueba.es` (gerencia) y `encargado@prueba.es` (encargado). Las contraseñas las puso Saúl |
| Netlify | Sin configurar todavía |

## Hecho

**1. Esqueleto del repo** (prompt 1)
- `web/` con Astro 7, `crm/` con Vite, React y TypeScript, y `supabase/`.

**2. Base de datos: núcleo** (prompt 2)
- Roles, matriz de permisos, perfiles, clientes, obras, trabajadores, categorías y tarifas de combustible.
- RLS en todas las tablas con `private.tiene_permiso(modulo, accion)`.
- Prueba de permisos por rol: `supabase/pruebas/permisos.sql`. Ahora hace 637 comprobaciones y da 0 fallos.

**3. Acceso al CRM** (prompt 3)
- Entrar, recuperar contraseña y elegir contraseña desde un enlace de invitación.
- Menú según el rol. Pantallas de clientes, obras y ajustes (categorías, tarifas, trabajadores y usuarios).
- Función `invitar-usuario`, desplegada en dev.

**4. Presupuestos** (prompt 6). **Probado por Saúl.**
- Base de precios con los 90 precios de la plantilla de IMTEX, partidas tipo y presupuestos.
- Editor con partidas y líneas, estados, duplicar, imprimir y crear la obra desde un presupuesto aceptado.
- Los totales coinciden al céntimo con `referencia/IMTEX_plantilla_presupuestos.html`: el test ejecuta las fórmulas originales.

**5. Control de obra** (prompt 7). **Pendiente de que Saúl lo pruebe metiendo datos.**
- Certificaciones, partes de horas, materiales, subcontratas, alquileres, combustible, y dietas y hoteles.
- Ficha de obra con resumen, matriz mensual, gráficos y comparativa con el presupuesto.
- Los resultados coinciden con `referencia/IMTEX_control_obra.html` usando sus datos de ejemplo.
- El listado y la portada calculan los totales con la misma función que la ficha, así que no pueden diferir.

**6. Extras pedidos por Saúl**
- Identidad de IMTEX: logo, colores, login con la composición de la tarjeta y logo de fondo en escritorio.
- Portada con resumen según los permisos, accesos y notas rápidas personales.

## Pendiente

**De Saúl, ahora**
- Probar Control de obra (los pasos están más abajo) y decir qué falla o qué cambiaría.
- Decir cuándo se borra la obra de ejemplo `EJEMPLO-OB-2026-01` de dev. Es ficticia e infla las cifras de la portada.

**Del CRM, para ponerlo en producción** (PLAN.md, parte C y hitos H4 y H5)
- Netlify: crear el sitio `imtex-crm` con base `crm/` y sus variables de entorno.
- Resend: dominio de envío `avisos.imtexsl.com` y SMTP en Supabase Auth. Sin esto, las invitaciones solo llegan a emails del equipo de Supabase. Hace falta acceso al DNS de `imtexsl.com`.
- Plantillas de correo de invitación y recuperación en español.
- Proyecto Supabase de producción (`imtex-prod`, plan Pro): aplicar migraciones, desactivar el registro público, activar la protección de contraseñas filtradas y dar de alta al primer usuario de gerencia. Los pasos están en `CLAUDE.md`.
- Dominio `gestion.imtexsl.com`.
- App instalable (PWA): manifest e iconos.
- Copias de seguridad externas semanales.
- Carga de datos reales: categorías, tarifas, obras en curso y usuarios. Formación y guía rápida por perfil.
- Contrato de encargado del tratamiento (RGPD) firmado antes de cargar datos personales.

**Web corporativa** (prompts 4 y 5). Es lo siguiente.
- Galería de obras con panel `/admin` (tablas `web_obras` y `web_fotos`, bucket `galeria`).
- Diseño, textos de empresa y servicios, las 22 obras, SEO y redirecciones desde Joomla.
- Va con retraso respecto al presupuesto (revisión el 12/10 y producción el 19/10), porque se decidió hacer antes el CRM.
- Material que hay que pedir a IMTEX: logo en vector, fotos de obras a buena resolución, datos del Registro Mercantil, email del formulario de contacto y acceso al DNS.

**Tienda online**
- Aparcada. La llevará Pedro, fuera de este repo.

**Fuera del alcance vendido** (se presupuesta aparte si IMTEX lo pide)
- Que cada operario meta sus propias horas, exportar a CSV, cerrar meses, facturación y Verifactu, modo sin conexión e idiomas.

## Cómo arrancar en otro ordenador

Hace falta Git, Node 22 o superior y Claude Code.

1. Clonar el repo y cambiar a la rama de trabajo:
   ```bash
   git clone https://github.com/ContactoExtreweb/Imtex.git
   ```
   ```bash
   cd Imtex && git checkout feat/control-obra
   ```
2. Instalar dependencias:
   ```bash
   cd crm && npm install
   ```
   ```bash
   cd ../web && npm install
   ```
3. Iniciar sesión en Supabase y enlazar el proyecto de desarrollo, desde la raíz del repo. El segundo comando pide la contraseña de la base de datos:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref vrhpxwnzthenjxubagys
   ```
4. Crear los `.env`, que no están en git. Copia `crm/.env.example` a `crm/.env` y `web/.env.example` a `web/.env`, y rellena:
   - La URL: `https://vrhpxwnzthenjxubagys.supabase.co`.
   - La clave publicable: está en el panel de Supabase, en Settings → API Keys. Empieza por `sb_publishable_`. Claude también puede rellenarla si se lo pides.
5. Arrancar el CRM y abrir http://localhost:5173:
   ```bash
   cd crm && npm run dev
   ```

Si al clonar Git no encuentra el repo, es que está usando otra cuenta de GitHub: la que tiene acceso es `Saulcorreyerop`.

## Cómo probar Control de obra

1. Entra como gerencia y abre **Control de obra → EJEMPLO-OB-2026-01**. Compara el resumen, la matriz y cada hoja con la herramienta `referencia/IMTEX_control_obra.html` abierta en el navegador.
2. En **P.2026-001 · Obra Prueba**, mete una certificación, un parte de horas (antes crea una categoría en Ajustes) y un apunte de combustible. El resumen debe actualizarse.
3. Entra como `encargado@prueba.es`: debe poder meter costes y partes, ver las certificaciones sin editarlas y no ver la pestaña Comparativa.

## Cómo seguir con Claude

Abre Claude Code en la carpeta del repo y dile qué quieres. Ejemplos:
- «Lee `docs/ESTADO.md` y dime por dónde vamos.»
- «He probado control de obra y falla esto: …»
- «Fusiona `feat/control-obra` en `main`.»
- «Empezamos con la web: prompt 4 de `docs/PLAN.md`.»

Cómo se ha trabajado hasta ahora, por si Claude no lo recuerda en ese ordenador:
- Todo en una misma conversación, encadenando los bloques del plan.
- No hay reunión de arranque con IMTEX: las dudas se resuelven con la propuesta del plan y se anotan en `decisiones.md`.
- Antes de cada bloque grande, Claude enseña un plan y espera el visto bueno.
- Git lo lleva Claude: commits pequeños en español, una rama por bloque.
- Claude no crea usuarios ni escribe contraseñas: eso lo hace Saúl en el panel de Supabase.

## Trampas conocidas

- **La API de Supabase da como mucho 1.000 filas por petición** y corta el resto sin avisar. Para listados que pueden crecer, usa `todasLasFilas` (`crm/src/lib/todas-las-filas.ts`); para sumas, una vista SQL.
- **`npx supabase migration new <nombre>` se queda colgado** si se lanza sin terminal interactiva: espera contenido por la entrada. Añade `< /dev/null` al final o crea el fichero a mano en `supabase/migrations/`.
- **`config.toml` solo vale para Supabase en local.** Lo de Auth (registro público, URLs) se cambia en el panel de cada proyecto.
- **El aviso «Leaked Password Protection Disabled»** del Security Advisor es del plan Pro: en dev no se puede quitar.
- **Para borrar la obra de ejemplo de dev**, cuando ya no haga falta:
  ```sql
  do $$ declare o uuid := (select id from public.obras where codigo = 'EJEMPLO-OB-2026-01');
  begin
    delete from public.certificaciones where obra_id = o;
    delete from public.partes_horas where obra_id = o;
    delete from public.materiales where obra_id = o;
    delete from public.subcontratas where obra_id = o;
    delete from public.alquileres where obra_id = o;
    delete from public.combustible where obra_id = o;
    delete from public.gastos_viaje where obra_id = o;
    delete from public.obras where id = o;
  end $$;
  ```
  Se lanza con `npx supabase db query --linked "<sql>"`, o se le pide a Claude.
