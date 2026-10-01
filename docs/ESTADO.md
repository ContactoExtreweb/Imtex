# Estado del proyecto IMTEX

Actualizado el 01/10/2026 por la noche, desde el PC de casa. Qué está hecho, qué falta y cómo seguir desde otro ordenador.
El plan completo está en [PLAN.md](PLAN.md) y el porqué de cada decisión en [decisiones.md](decisiones.md).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Código | GitHub, `ContactoExtreweb/Imtex` (privado) |
| Rama con todo el trabajo | **`feat/cierre-meses`**. Incluye las anteriores: `feat/control-obra`, `feat/galeria-crm` y `feat/avisos-portada` |
| `main` | Llega hasta Presupuestos. Lo demás se fusiona cuando Saúl lo pruebe |
| Base de datos de desarrollo | Supabase, proyecto `imtex-dev`, ref `vrhpxwnzthenjxubagys` (Fráncfort). Tiene aplicadas todas las migraciones del repo |
| Base de datos de producción | Sin crear todavía |
| Usuarios de prueba en dev | `saul@prueba.es` (gerencia) y `encargado@prueba.es` (encargado). Las contraseñas las puso Saúl |
| Netlify | Sin configurar todavía |

## Hecho

**1. Esqueleto del repo** (prompt 1)
- `web/` con Astro 7, `crm/` con Vite, React y TypeScript, y `supabase/`.

**2. Base de datos: núcleo** (prompt 2)
- Roles, matriz de permisos, perfiles, clientes, obras, trabajadores, categorías y tarifas de combustible.
- RLS en todas las tablas con `private.tiene_permiso(modulo, accion)`.
- Prueba de permisos por rol: `supabase/pruebas/permisos.sql`. Ahora hace 763 comprobaciones y da 0 fallos.

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
- Los listados piden todas las páginas a la API: ya no se cortan en 1.000 filas.

**6. Galería de la web desde el CRM.** **Pendiente de que Saúl la pruebe subiendo fotos.**
- Tablas `web_obras` y `web_fotos`, y bucket `galeria`. Los visitantes de la web solo leen lo publicado.
- Apartado «Galería web» en el menú y botón «Publicar en la web» en la ficha de cada obra.
- Ficha con zona para arrastrar fotos, categoría, textos, portada y publicar o despublicar.
- Las fotos se reducen en el navegador (JPEG de 2.000 px y miniatura). No se hace el `/admin` dentro de la web.

**7. Avisos y resumen del mes en la portada.** **Pendiente de que Saúl lo vea con datos.**
- Bloque «Avisos» sobre las obras en ejecución: en pérdidas, margen bajo (menos del 5 %), margen justo (5–15 %), coste superado y desviación del presupuesto.
- Dos cifras nuevas: certificado y resultado del mes en curso, con el mes anterior debajo.
- Los avisos de presupuesto solo los ve quien puede ver presupuestos.

**8. Cierre de meses y exportación.** **Pendiente de que Saúl lo pruebe.**
- Gerencia cierra y reabre meses por obra, en la pestaña Resumen de la ficha. El permiso es el módulo `cierre_meses`.
- En un mes cerrado nadie puede añadir, cambiar ni borrar apuntes. Lo impide la base de datos con triggers, no solo la pantalla.
- Tampoco se puede tocar una certificación si otra posterior está en un mes cerrado, ni el % de gastos generales de una obra con meses cerrados.
- Botón «Exportar CSV» (se abre en Excel) y botón «Imprimir» (informe en A4 apaisado, para guardar como PDF).
- Prueba del cierre: `supabase/pruebas/cierre.sql`, con 62 comprobaciones y 0 fallos.

**9. Extras pedidos por Saúl**
- Identidad de IMTEX: logo, colores, login con la composición de la tarjeta y logo de fondo en escritorio.
- Portada con resumen según los permisos, accesos y notas rápidas personales.

## Pendiente

**De Saúl, ahora: probar lo que no ha visto con la sesión iniciada.** Claude no puede entrar con los usuarios, así que las pantallas de los puntos 5 a 8 solo están comprobadas con tests y con los datos de dev. Los pasos están en «Qué probar».

**Decisiones que faltan**
- Cuándo se borra la obra de ejemplo `EJEMPLO-OB-2026-01` de dev. Es ficticia e infla las cifras de la portada.
- Si las ampliaciones (avisos, cierre de meses y exportación) se le facturan a IMTEX.

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

**Ampliación aprobada que espera**
- Seguimiento comercial de presupuestos (envío por correo, recordatorios y versiones): se hace cuando esté Resend.

**Mejoras técnicas propuestas por Claude, sin hacer**
- Comprobaciones automáticas en GitHub (build, lint y tests en cada PR).
- Proteger en la base de datos los presupuestos enviados y aceptados: hoy solo lo impide la pantalla.
- Guardar quién modificó cada apunte y el valor anterior.
- Cargar los gráficos solo al entrar en Control de obra: el JavaScript pesa 1,3 MB.
- Pruebas de recorrido completo con un usuario de prueba.
- Actualizar las dependencias de `web/`: `npm audit` da 8 avisos en el adaptador de Netlify.

**Web corporativa** (prompts 4 y 5). Es lo siguiente grande.
- Páginas públicas de la galería (`/obras` y `/obras/[slug]`): leen `web_obras` y `web_fotos`. El panel ya está hecho en el CRM.
- Diseño, textos de empresa y servicios, las 22 obras, SEO y redirecciones desde Joomla.
- Va con retraso respecto al presupuesto (revisión el 12/10 y producción el 19/10), porque se decidió hacer antes el CRM.
- Material que hay que pedir a IMTEX: logo en vector, fotos de obras a buena resolución, datos del Registro Mercantil, email del formulario de contacto y acceso al DNS.

**Tienda online**
- Aparcada. La llevará Pedro, fuera de este repo.

**Fuera del alcance vendido** (se presupuesta aparte si IMTEX lo pide)
- Que cada operario meta sus propias horas, facturación y Verifactu, modo sin conexión e idiomas.

## Cómo arrancar en otro ordenador

Hace falta Git, Node 22 o superior y Claude Code.

**Si el repo ya está en ese ordenador** (la oficina), basta con traer la rama e instalar lo nuevo:
```bash
git fetch && git checkout feat/cierre-meses && git pull
```
```bash
cd crm && npm install
```

**Si se empieza de cero:**
1. Clonar el repo y cambiar a la rama de trabajo:
   ```bash
   git clone https://github.com/ContactoExtreweb/Imtex.git
   ```
   ```bash
   cd Imtex && git checkout feat/cierre-meses
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

**Para verlo desde el móvil** (mismo wifi que el ordenador):
```bash
cd crm && npm run dev -- --host
```
Vite enseña la dirección de red (por ejemplo, `http://192.168.1.143:5173`): ábrela en el móvil. Si no carga, Windows estará bloqueando la conexión: hay que permitir Node.js en el cortafuegos para redes privadas. Cuando Claude arranca el servidor ya lo hace con `--host`.

## Qué probar

**Control de obra**
1. Entra como gerencia y abre **Control de obra → EJEMPLO-OB-2026-01**. Compara el resumen, la matriz y cada hoja con la herramienta `referencia/IMTEX_control_obra.html` abierta en el navegador. Debe dar 1.014.600,00 € certificados, 354.337,00 € de costes y un margen del 65,1 %.
2. En **P.2026-001 · Obra Prueba**, mete una certificación, un parte de horas (antes crea una categoría en Ajustes) y un apunte de combustible. El resumen debe actualizarse.
3. Entra como `encargado@prueba.es`: debe poder meter costes y partes, ver las certificaciones sin editarlas y no ver la pestaña Comparativa.

**Galería de la web**
1. Obras → abre una obra → **Publicar en la web**.
2. Arrastra 3 o 4 fotos. Pruébalo también desde el móvil.
3. Elige categoría, cambia la portada, mueve alguna foto y borra otra.
4. Pulsa **Guardar y publicar**, y luego **Despublicar**.
5. Como encargado no debe verse «Galería web» ni el botón.

**Avisos de la portada**
1. Como gerencia, la portada debe decir que no hay avisos y mostrar el certificado y el resultado del mes.
2. En «Obra Prueba», mete un material de 300 € sin certificar nada: debe avisar de que se desvía del presupuesto.
3. Como encargado no deben salir avisos de presupuesto.

**Cierre de meses y exportación**
1. Como gerencia, en la obra de ejemplo, pestaña Resumen, baja a **Cierre de meses** y cierra enero-26. Debe salir el candado en la matriz.
2. Ve a Materiales: los apuntes de enero salen con candado, se abren en solo lectura y no se pueden borrar. Al añadir uno nuevo con el mes de enero, debe avisar de que está cerrado.
3. Reabre enero y comprueba que se vuelve a poder editar.
4. Pulsa **Exportar CSV** y ábrelo en Excel: los importes deben ser números y las tildes deben verse bien.
5. Pulsa **Imprimir** y guarda como PDF: debe salir apaisado, con la cabecera de IMTEX.
6. Como encargado: ve los candados, pero no tiene los botones de cerrar y reabrir.

## Cómo seguir con Claude

Abre Claude Code en la carpeta del repo y dile qué quieres. Ejemplos:
- «Lee `docs/ESTADO.md` y dime por dónde vamos.»
- «He probado control de obra y falla esto: …»
- «Fusiona `feat/cierre-meses` en `main`.» Esa rama lo incluye todo.
- «Empezamos con la web: prompt 4 de `docs/PLAN.md`.»

Cómo se ha trabajado hasta ahora, por si Claude no lo recuerda en ese ordenador:
- Todo en una misma conversación, encadenando los bloques del plan.
- No hay reunión de arranque con IMTEX: las dudas se resuelven con la propuesta del plan y se anotan en `decisiones.md`.
- Antes de cada bloque grande, Claude enseña un plan y espera el visto bueno.
- Git lo lleva Claude: commits pequeños en español, una rama por bloque.
- Claude no crea usuarios ni escribe contraseñas: eso lo hace Saúl en el panel de Supabase.
- Se trabaja desde dos ordenadores (casa y oficina). Al terminar cada bloque se actualiza este documento y se sube la rama.

## Trampas conocidas

- **La API de Supabase da como mucho 1.000 filas por petición** y corta el resto sin avisar. Para listados que pueden crecer, usa `todasLasFilas` (`crm/src/lib/todas-las-filas.ts`); para sumas, una vista SQL.
- **`crypto.randomUUID()` solo existe en HTTPS o en localhost.** Entrando desde el móvil por la IP no está. Usa `idAleatorio` (`crm/src/lib/id.ts`).
- **En las políticas RLS con subconsultas, escribe el nombre de la tabla en las columnas.** `web_obras` y `web_fotos` tienen las dos una columna `obra_id`: sin el nombre de la tabla, la subconsulta cogía la que no era y los visitantes no veían las fotos. Lo detectó la prueba de permisos.
- **`npx supabase migration new <nombre>` se queda colgado** si se lanza sin terminal interactiva: espera contenido por la entrada. Añade `< /dev/null` al final o crea el fichero a mano en `supabase/migrations/`.
- **`config.toml` solo vale para Supabase en local.** Lo de Auth (registro público, URLs) se cambia en el panel de cada proyecto.
- **El aviso «Leaked Password Protection Disabled»** del Security Advisor es del plan Pro: en dev no se puede quitar.
- **Para borrar la obra de ejemplo de dev**, cuando ya no haga falta. Primero se reabren sus meses, porque los apuntes de un mes cerrado no se pueden borrar:
  ```sql
  do $$ declare o uuid := (select id from public.obras where codigo = 'EJEMPLO-OB-2026-01');
  begin
    delete from public.meses_cerrados where obra_id = o;
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
