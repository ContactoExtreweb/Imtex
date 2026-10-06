# Estado del proyecto IMTEX

Actualizado el martes 06/10/2026. Qué está hecho, qué falta y cómo seguir desde otro ordenador.
El plan completo está en [PLAN.md](PLAN.md) y el porqué de cada decisión en [decisiones.md](decisiones.md).

## Por dónde vamos (martes 06/10)

Todo está en GitHub en la rama **`feat/partes-whatsapp`**, que incluye todo lo anterior (`feat/web-realista`, `feat/web`, `feat/bajas`…).

**Martes 06/10 por la tarde: partes de trabajo por WhatsApp** (ampliación; detalle en el punto 13 de «Hecho»). Los trabajadores mandan la foto del parte en papel por WhatsApp, la IA la lee, se les contesta con un resumen para confirmar y, confirmado, se apunta en el control de obra. Hecho todo lo que no depende de cuentas: base de datos, funciones de Supabase (desplegadas en dev) y la bandeja «Partes de trabajo» del CRM, desde donde también se pueden subir las fotos. **Falta:** la cuenta de WhatsApp Business de Meta y la clave de la API de Anthropic (ver «Puesta en marcha» en el punto 13). El primer parte real (Mercadona, Madrid) se leyó bien.

**Qué se hizo el lunes 05/10:**
- **En la oficina:** la casa de Particulares con materiales y luz reales. A Saúl le pareció poco real y se cambió de camino: **vídeo renderizado con Blender**. Detalle en «Escenas realistas», en el punto 12 de «Hecho».
- **En la sesión de Claude en la nube:** se midió la web con Lighthouse en el móvil por primera vez y se arregló lo que salió:
  - El 3D solo se carga si el navegador tiene tarjeta gráfica; si no, la foto sale al momento.
  - Contraste suficiente en los dos temas.
  - Canónicas sin barra final.
  - Imagen para compartir la web en redes y WhatsApp.
  - Resultado: de 36–42 a 94–99 en las páginas con 3D. Detalle en «Rendimiento y accesibilidad», también en el punto 12.
- **Render de Particulares, también en la nube** (Blender instalado allí, con el procesador). Mancha y charco con forma, agua que deja ver la lámina, cuadro bien colgado, y césped, setos, cipreses, encinas y casas vecinas. La web ya tiene el reproductor del vídeo con la leyenda sincronizada.
- **Por la tarde, en la oficina: vídeo definitivo de Particulares.** Saúl dio el visto bueno a los fotogramas tal cual. Se renderizó en el PC de la RTX 4060 (446 fotogramas a 960 px, unos 9 s cada uno, 1 h y 6 min) y se codificó: `particulares.webm` 3,3 MB y `particulares.mp4` 2,6 MB. **`/particulares` ya enseña el vídeo** y la escena 3D de la casa en tiempo real se ha quitado. Comprobado: el vídeo carga, va en bucle y sin sonido, y la leyenda sigue al vídeo. Las demás páginas mantienen su 3D.

- **Por la noche, en casa: Empresa también es vídeo de Blender** (detalle en «Escenas realistas»):
  - La furgoneta de IMTEX (Mercedes Sprinter de Sketchfab, de Savelliy 07, CC BY 4.0, citada en el aviso legal), aparcada en la nave, baja con su plataforma elevadora el palé cargado con sacos, rollos, cubos y la bobina de carbono.
  - La furgoneta lleva la rotulación de IMTEX; la nave, un cartel con el logo y el lema; los productos, el logo impreso.
  - La cámara para en cada material (la leyenda) y vuelve al plano general; el bucle funde a oscuro.
  - Saúl vio la vista previa y pidió pasarla a la web tal cual: **`/empresa` ya enseña el vídeo** (`empresa.webm` 1,8 MB, `empresa.mp4` 1,6 MB) y el palé en 3D se ha quitado.
  - El PC de casa renderiza con la Radeon (HIP): Empresa salió en 32 min, a unos 4 s por fotograma.

**Martes 06/10, en la oficina:**
- Saúl da por buenos los vídeos de Blender de Particulares y Empresa: **se quedan como están**.
- **Cabecera en tableta:** a 1024 px (donde entra el menú completo) no cabía y el teléfono y «Pedir presupuesto» se partían en dos líneas. Ahora, de 1024 a 1279 px solo se ve el icono del teléfono (el número sale desde 1280 px), el menú se aprieta un poco y los botones (`.boton`) nunca se parten. Comprobado a 375, 1024 y 1280 px.
- **Fabricantes de Empresa en una cinta sin fin** (`web/src/components/Marquesina.astro`): ya no se cortan por los lados en el móvil; pasan solos y se paran al pasar el ratón. Con las animaciones reducidas no se mueven y el texto se parte en líneas.
- **Lema de la portada** (la banda roja): quieto, como pidió Saúl, y entero en el móvil. El rojo sigue saliendo por los lados, pero el texto se queda dentro de la pantalla y, si no cabe, se parte en dos líneas (en el móvil: «Soluciones técnicas para / industria y construcción»). Desde 768 px va en una línea. Se quitó la animación `deriva`, que ya no usaba nadie.
- **Pie:** «Desarrollado por extreweb», con enlace a extreweb.es. Y se arregló el código postal pegado a la localidad («06700Villanueva»).

**Lo que Claude necesita de ti:**
- Partes por WhatsApp: la cuenta de Meta Business y el número, y la clave de Anthropic (los pasos, en el punto 13). Más partes rellenados de distintos trabajadores, para afinar la lectura. Y mirar las pantallas nuevas («Qué probar» → Partes de trabajo), que Claude no puede ver sin usuario.
- Ver `/empresa` y `/particulares` con el vídeo en movimiento, en el ordenador y en el iPhone (Claude solo ve fotogramas sueltos), el lema de la portada y la cinta de los fabricantes en el móvil.
- Mirar la imagen para compartir (`web/public/compartir.jpg`): marca, titular de la portada y la foto de Almaraz.
- Decidir si se hace lo mismo (vídeo con Blender) en Servicios, Obras y Contacto, y después en la portada.
- El coche del garaje, si lo compras (enlaces en el chat del 05/10; el recomendado es el «Generic Hatchback Car With Interior» de Superhive, 20 $).

**Para seguir en casa:** `git pull` en la rama `feat/web-realista` y, en `web/`, `npm install` (no hay dependencias nuevas, pero no cuesta nada) y `npm run dev`. Para ver la web no hace falta Blender. **Solo si hay que volver a renderizar:** instalar Blender 5.2 (`winget install --id BlenderFoundation.Blender -e --source winget`), bajar los recursos con `cd web && node render/recursos.mjs` (81 MB, no están en git) y seguir «Cómo sacar el vídeo definitivo», en el punto 12. **En el PC de casa ya está todo** (05/10 por la noche): Blender 5.2.2 y los recursos. Renderiza con la AMD RX 6650 XT (HIP) a unos 20 s por fotograma a 960 px, así que el vídeo entero tarda unas 2,5 h. Sin tarjeta gráfica, con el procesador, un fotograma tarda unos 50 s (el vídeo, unas 6 h).

**Para seguir con Claude:** abre Claude Code en la carpeta del repo y dile «Lee `docs/ESTADO.md` y seguimos con la web».

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Código | GitHub, `ContactoExtreweb/Imtex` (privado) |
| Rama con todo el trabajo | **`feat/web-realista`** (escenas realistas, vídeo de Particulares con Blender, Lighthouse). Incluye `feat/web-animaciones`, `feat/web`, `feat/bajas` y las anteriores: `feat/cierre-meses`, `feat/control-obra`, `feat/galeria-crm` y `feat/avisos-portada` |
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
- Prueba de permisos por rol: `supabase/pruebas/permisos.sql`. Ahora hace 847 comprobaciones y da 0 fallos.

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

**10. Revisión del CRM en el móvil** (02/10/2026)
- Revisadas todas las pantallas a 320, 375 y 768 px con los datos de dev: ninguna se sale de la pantalla.
- Las cifras de la portada y del resumen de la obra van en el componente `Cifras`: en el móvil, una fila por cifra; en pantallas anchas, el número se encoge para caber en su celda. Probado con importes de millones.
- Los listados ya no cortan el texto en el móvil: el título ocupa hasta dos líneas y el detalle (importes, fechas) se ve entero.
- Botones pequeños, el del menú y el de cerrar diálogos miden al menos 36 px en el móvil.
- La pestaña activa se desliza hasta quedar a la vista. Las dos hojas de impresión se leen también en el móvil.
- No se pudo revisar la ficha de la galería: en dev no hay ninguna obra publicada en la web.

**11. Bajas: papeles de baja de los trabajadores** (02/10/2026). Ampliación. **Pendiente de que Saúl la pruebe: Claude no ha podido ver la pantalla con sesión iniciada.**
- Apartado «Bajas» en el menú, para todos los usuarios. Cada trabajador sube sus papeles (tipo de parte, comentario y archivo) y ve su historial con la fecha y la hora de subida.
- Gerencia y administración (módulo `bajas`) ven el historial de todos, con filtros por trabajador y tipo, y pueden subir un papel en nombre de un trabajador. Queda escrito quién lo subió.
- La fecha y el autor los pone la base de datos. Un papel no se edita: se borra y se sube otro. El trabajador borra solo lo que subió él.
- Formatos: fotos (pasan a JPEG), PDF, Word, OpenDocument y texto. 25 MB por archivo.
- Bucket `bajas` privado: los archivos se abren con un enlace firmado que caduca a la hora.
- Para que un trabajador pueda subir los suyos necesita usuario y que su ficha de Ajustes → Trabajadores esté enlazada a ese usuario.
- No incluye: avisar a administración cuando se sube un papel, agrupar por proceso de baja ni borrado automático.

**12. Web pública (rama `feat/web`)**. Plan aprobado el 02/10/2026. **Todas las páginas están hechas; falta el visto bueno de Saúl y lo de producción.**
- **Diseño**: dirección «La obra por fases», elegida por Saúl con la skill impeccable (contrato en `web/.impeccable/surfaces/`, producto en `web/PRODUCT.md`). Tipografía Archivo variable autoalojada. **Tema oscuro por defecto**, con botón en la cabecera para pasar al claro (se recuerda en el navegador).
- **Portada**: maqueta 3D de una esquina de cubierta (three.js, hecha con código en `web/src/scripts/pieza.ts`) que al bajar pasa por seis fases reales de obra, con las herramientas trabajando, un encuadre de cámara por fase y el logo de IMTEX pintado al final. Saúl la dio por buena. Sin WebGL o sin tarjeta gráfica, con animaciones reducidas o poca memoria, salen las fotos reales de cada fase. En desarrollo, `__pieza.saltar(3.6)` en la consola lleva a una fase concreta.
- **Páginas**: `/servicios` y sus cuatro fichas, `/obras` (con filtro por servicio) y la ficha de cada obra (datos, trabajos paso a paso y visor de fotos), `/empresa`, `/particulares`, `/contacto`, los tres legales y el 404.
- **Menú del móvil** (04/10, estándar de extreweb): a pantalla completa, con el logo arriba que se destapa tras una barra roja, los enlaces en el centro entrando en cascada y presupuesto, teléfono y email abajo. Es un popover nativo; la cabecera no cambia.
- **Animaciones de entrada** (04/10): en las páginas interiores y en las secciones de la portada bajo la maqueta, los bloques marcados con `data-aparece` entran solos (fundido y subida, escalonados con `--i`) la primera vez que se ven, sin ir atados al scroll. El mecanismo está en `web/src/layouts/Base.astro` y `global.css`. No se ponen en elementos con su propia transición ni en la foto que viaja a la ficha de la obra.
- **Objetos 3D de las páginas interiores** (04/10): en la entrada de cada página, un objeto que trabaja solo, en bucle, sin depender del scroll, con una leyenda en HTML que marca lo que pasa en cada momento:
  - **Servicios:** un tablero sobre una viga que pasa por los cuatro servicios. Al señalar uno en la leyenda, salta a él y espera.
  - **Obras:** el mapa de España y Portugal en relieve; las obras publicadas se encienden una a una, con enlace a su ficha.
  - **Empresa** y **Particulares:** ya no son 3D, sino vídeos de Blender (ver «Escenas realistas»).
  - **Contacto:** el mismo mapa, con arcos desde la sede.
  
  Código en `web/src/scripts/escena3d/` (base común, una escena por fichero) y `web/src/components/Objeto3D.astro`. Mismas condiciones que la portada: sin WebGL o sin tarjeta gráfica, con animaciones reducidas, con ahorro de datos o con poca memoria sale una foto o el mapa en SVG.
  - **Sobre el mapa:** cada obra se sitúa por su texto de «lugar» con la tabla de `web/src/lib/lugares.ts`; una obra en un sitio que no esté en la tabla no sale en el mapa y el servidor lo avisa en la consola. El contorno sale de Natural Earth y se regenera con `cd web && node scripts/generar-mapa.mjs`.
  - **En desarrollo:** `__escena.fijar(7.5)` en la consola congela la escena en ese segundo; `__escena.fijar(null)` la suelta.
- **Escenas realistas** (05/10, rama `feat/web-realista`). **Particulares ya es un vídeo renderizado con Blender** (detalle abajo). Primero se probó en tiempo real con texturas escaneadas, cielo real, oclusión ambiental y modelos de Poly Haven, pero a Saúl no le pareció real y se quitó al llegar el vídeo. **El coche del garaje no está** hasta tener un modelo realista: lo consigue Saúl.
  - Si gusta el vídeo, se hace lo mismo en Empresa, Servicios, Obras y Contacto (cada escena con su lista de descargas, que Saúl aprueba) y luego se decide la portada.
  - **05/10: Saúl lo vio poco real. Se cambia de camino: vídeo renderizado con Blender (Cycles) en vez de escena en tiempo real.** Blender 5.2.2 instalado con winget (RTX 4060 con OptiX: unos 3 s por fotograma a 960 px). Recursos del render en `web/.polyhaven/render/` (81 MB, fuera de git), bajados con `cd web && node render/recursos.mjs`. La escena es `web/render/particulares.py` (misma historia y tiempos que `casa.ts`, a escala real, en su parcela). Fotogramas de prueba: `blender -b --factory-startup --python render/particulares.py -- --fotogramas 140,276,350 --muestras 64 --ancho 960`; salen en `web/.render/particulares/`.
  - **05/10, en la sesión de Claude en la nube** (Blender 5.2.2 sin tarjeta gráfica: el script usa el procesador si no hay OptiX):
    - La mancha de humedad y el charco van ahora en los materiales de la pared y del suelo del salón. La mancha baja desde el techo con borde irregular y cerco; el charco es redondo e irregular, con película de agua. Los dos se secan al final.
    - El fondo de la piscina salía negro: el agua tocaba la lámina en el mismo plano y, sin cáusticas, no dejaba pasar la luz. Ya se ve la lámina azul a través del agua.
    - El cuadro estaba de espaldas (se veía el cartón) y su lámina era una muestra del fabricante con texto («Ray Homes»). Ahora mira a la sala, con una pintura abstracta en tonos tierra. Los cristales de los modelos son vidrio fino.
    - Entorno: césped de briznas, setos en las tapias y cipreses (nodos de geometría), cuatro encinas, cuatro casas vecinas con tejado de teja, y bruma que funde el campo lejano con el horizonte.
    - La membrana roja salía rosada con sol (AgX aclara los rojos saturados): ahora es más oscura.
    - Fotogramas de revisión y una hoja con un fotograma por segundo, enviados por el chat el 05/10. Se repiten con `-- --fotogramas 0,100,165,270,350 --muestras 64 --ancho 960`.
  - **Vídeo en la web, hecho (05/10 por la tarde):** `src/components/VideoBucle.astro` reproduce `public/video/particulares.webm` (3,3 MB) o `.mp4` (2,6 MB, para Safari) en bucle, sin sonido y solo mientras se ve, con la leyenda sincronizada por los tramos de la historia (los mismos segundos que en `render/particulares.py`). Con animaciones reducidas o ahorro de datos se queda el cartel (`src/assets/video/particulares.jpg`, el primer fotograma) y no se descarga.
  - **Quitado al poner el vídeo:** la casa en tiempo real (`escena3d/casa.ts`), sus recursos (`escena3d/real.ts`, `public/3d` y `scripts/preparar-3d.mjs`) y la oclusión ambiental de `escena3d/base.ts`, que solo usaba la casa. Las otras cuatro escenas 3D siguen igual. Si alguna vez hiciera falta, está en el historial de git (commit 747a265).
  - **Cómo volver a sacar el vídeo** (si cambia la escena; en el PC con la RTX 4060). Desde `web/`:
    1. `blender -b --factory-startup --python render/particulares.py -- --video --muestras 64 --ancho 960`. Tarda 1 h aprox. (unos 9 s por fotograma con la RTX 4060). Los fotogramas van a `.render/particulares/video-960/`; si se corta, se vuelve a lanzar y sigue. **Si se cambia la escena, antes hay que borrar esa carpeta**, porque los fotogramas ya hechos se saltan.
    2. `blender -b --factory-startup --python render/codificar.py -- --nombre particulares --ancho 960`. Deja `public/video/particulares.webm` y `.mp4` y el cartel `src/assets/video/particulares.jpg`. Tarda unos 5 min.
    3. Mirar el peso de los vídeos (lo ideal, por debajo de 3–4 MB cada uno; si pasan, `--calidad 34`), probar la página y subir los tres ficheros.
    - Fotogramas sueltos para revisar antes: `-- --fotogramas 0,100,165,270,350 --muestras 64 --ancho 960` (menos de 1 min con la RTX 4060). Salen en `.render/particulares/prueba_NNN.png`.
    - **Por equipo**, a 960 px y 64 muestras:
      - RTX 4060 de la oficina (OptiX): unos 9 s por fotograma.
      - RX 6650 XT de casa (HIP): unos 20 s por fotograma, unas 2,5 h el vídeo.
      - Sin tarjeta gráfica: unos 50 s por fotograma, unas 6 h el vídeo. Una vista previa a 480 px tarda unos 95 min.
    - **En AMD, sin el trazado por hardware (HIP RT):** con la RX 6650 XT sale mal (paredes verdes, sofá como de cristal), así que el script lo deja apagado. `--con-hiprt` lo prueba, por si un controlador o un Blender nuevo lo arreglan.
  - El coche, cuando Saúl lo compre.
  - **Empresa en vídeo (05/10 por la noche, en casa).** Escena en `web/render/empresa.py`; lo común de todas las escenas, en `web/render/comun.py` (Cycles con la tarjeta que haya, materiales, modelos de Poly Haven, calcomanías y textos pegados a una superficie, y el bucle de render).
    - **Historia (16 s):** plano general de la furgoneta y el cartel → la plataforma baja el palé (1,4–5,6 s) → paradas en Morteros 6,2–7,8 s, Láminas 7,8–9,4 s, Resinas 9,4–11 s y Fibra de carbono 11–12,6 s (los tramos de la leyenda en `empresa.astro`) → vuelta al plano general. El bucle funde a oscuro medio segundo al final y al principio (`codificar.py --fundido 0.5`).
    - **Furgoneta:** el `.blend` de Sketchfab va en `web/.modelos/sprinter/source/` (fuera de git; hay que bajarlo con cuenta de Sketchfab). El script la pinta de blanco, le quita las estrellas de Mercedes, recorta el hueco trasero, forra la zona de carga, pone puertas propias abiertas a 270° y pega los vinilos (logo, lema, teléfono y web) a una copia invisible de toda la chapa.
    - **Recursos:** `cd web && node render/recursos.mjs empresa` (Poly Haven: nave `small_hangar_01`, saco de cemento con impresión propia, estantería, carretilla y texturas).
    - **Para rehacerlo**, desde `web/`: `blender -b --factory-startup --python render/empresa.py -- --video --muestras 64 --ancho 960` y luego `blender -b --factory-startup --python render/codificar.py -- --nombre empresa --ancho 960 --fundido 0.5` (con `--vista-previa`, solo un MP4 en `.render/empresa/` para revisarlo antes). Fotogramas sueltos: `-- --fotogramas 0,130,210,290,345`; una vista fija: `--camara x,y,z,mx,my,mz`.
- **Animaciones atadas al scroll** (se mantienen): paso de una página a otra con barrido, y la foto de una obra viaja del listado a su ficha (transiciones de vista nativas del navegador, sin JavaScript); fotos que se destapan y se mueven algo más despacio que la página; números de paso que se encienden al pasar. Todo se apaga si el visitante tiene las animaciones desactivadas, y en navegadores sin soporte simplemente no se anima.
- **Galería**: las 22 obras de la web antigua están en dev (205 fotos con miniatura, fichas publicadas, seis destacadas). Se repite con `web/scripts/importar-obras.mjs` (leer → fotos → sql) y `supabase/seed_web_obras.sql`; las instrucciones para subir las fotos están en la cabecera del script. La web lee la galería con `fetch` (`web/src/lib/galeria.ts`): lo que se publica en el CRM sale sin volver a desplegar (caché de 5 minutos).
- **Formulario de contacto** (`web/src/pages/api/contacto.ts`): valida, tiene campo trampa y tiempo mínimo contra robots, y envía con Resend. **Sin `RESEND_API_KEY` no envía**: avisa y enseña teléfono y email. Funciona también sin JavaScript.
- **SEO**: título, descripción y canónica (`www.imtexsl.com`, sin barra final) por página, Open Graph con imagen, datos estructurados (empresa, servicios y migas), `/sitemap.xml` con las obras publicadas, `robots.txt` y las redirecciones 301 de la web antigua (`web/public/_redirects`).
  - Las páginas estáticas se generan como `empresa.html` (`build.format: 'file'`) y Netlify las sirve en `/empresa`. `rutaDe` (`web/src/lib/empresa.ts`) quita el `.html` que Astro pone al compilarlas.
  - Imagen para compartir: `web/public/compartir.jpg` (1200 × 630, unos 90 KB), en todas las páginas salvo las fichas de obra, que usan su foto. Se rehace con `cd web && node scripts/imagen-compartir.mjs`, a partir de la plantilla `scripts/imagen-compartir.html` y con el Chrome instalado.
- **Rendimiento y accesibilidad** (05/10). Medido con Lighthouse en móvil, en local y sin la galería:
  - Antes: 36–42 en las páginas con 3D. Sin tarjeta gráfica, cada fotograma bloqueaba la página. Sin WebGL, la foto de respaldo no salía hasta que three.js se descargaba y fallaba.
  - Ahora: portada 94–96, Particulares 98, Empresa y Servicios 97, Contacto 99. Accesibilidad, buenas prácticas y SEO, 100. axe da 0 fallos de contraste en los dos temas.
  - Cómo se decide el 3D: `puede3d` en `web/src/layouts/Base.astro`. Para ver el 3D en un equipo sin tarjeta gráfica, en la consola: `localStorage.setItem('forzar-3d', 'si')`.
  - Lo que espera su turno (números y cifras de las fases, números de los pasos) usa el color `apagado`, distinto en cada tema, para no bajar de 3:1.
- **Sin comprobar**: Lighthouse con las obras de la galería y ya en Netlify, un móvil de verdad, las animaciones en movimiento (Claude solo ve capturas fijas) y el envío real del formulario.
- **A confirmar con IMTEX**: fechas de CETARSA (2012-2022 o 2012-2024); razón social exacta y datos del Registro Mercantil para el aviso legal; que los legales los revise su asesoría; el texto de `/particulares` (es una suposición razonable de lo que hacen en viviendas); qué significan exactamente los códigos de clasificación; permiso para logotipos de fabricantes (hoy van en texto); fotos a más resolución y logo en vector. El mapa de contacto señala el centro del polígono, no la parcela 31.
- En el bucket de dev quedan 8 archivos duplicados en `obras/obras/viaducto-casatejada/`, de una subida a la carpeta equivocada. No molestan.

**13. Partes de trabajo en papel por WhatsApp** (06/10/2026, rama `feat/partes-whatsapp`). Ampliación. **Hecho lo que no depende de cuentas; faltan la de Meta y la clave de Anthropic.**
- **Qué es:** la hoja diaria que rellena la cuadrilla a mano (obra, fecha, trabajadores con horas y extras, vehículo y km, trabajos, material, mediciones). La manda por WhatsApp quien tenga su teléfono en su ficha (normalmente el encargado). La IA la lee y le contesta con un resumen y tres botones: «Está bien», «Corregir» y «Anular». Las correcciones se escriben con sus palabras («Pedro hizo 9 horas») y la IA las aplica. Al confirmar, se apunta solo en el control de obra: una línea de Personal por trabajador (con los precios de su categoría) y una de Combustible con los km. Si no se puede apuntar (falta la categoría de alguien, el mes está cerrado…), pasa a la oficina y se le avisa.
- **Base de datos** (migraciones `partes_trabajo` y `partes_trabajo_mediciones`):
  - Tabla `partes_trabajo`, con la foto en el bucket privado `partes`, y teléfono de WhatsApp en `trabajadores`.
  - `apuntar_parte(id)`: pasa la hoja al control de obra, todo o nada. Rechaza más de 16 h por persona y día o más de 1.500 km (una mala lectura no llega a los costes), y respeta el cierre de meses.
  - Permisos, los del módulo `partes_horas`. Un parte apuntado ya no se edita, y los partes no se borran: se descartan.
  - Los apuntes llevan `parte_trabajo_id`: en el control de obra salen con un enlace «Parte» que abre el parte y su foto.
  - Jornada de contrato en `trabajadores` (`jornada_horas`, 8 por defecto). En el papel, la casilla HORAS vacía es la jornada y lo que se escribe son las EXTRAS (así lo rellenan).
  - Pruebas: `supabase/pruebas/partes.sql` (38 comprobaciones) y `permisos.sql` (903), con 0 fallos.
- **Funciones de Supabase**, desplegadas en dev:
  - `whatsapp`: el webhook de Meta. Comprueba la firma de cada aviso; sin los secrets, lo rechaza todo.
  - `leer-parte`: la lectura para las fotos subidas desde el CRM.
  - Lo común, en `supabase/functions/_shared/` (`partes.ts`, sin nada de Deno, lo importa también el CRM; 20 pruebas en `crm/src/lib/partes.test.ts`).
  - Modelo: Claude Sonnet (constante `MODELO` en `_shared/lector.ts`).
- **CRM:**
  - Menú «Partes de trabajo»: bandeja con pendientes, apuntados y descartados.
  - Ficha con la foto al lado (se gira y se abre entera) y todo editable. Avisa de lo que hay que mirar y enseña lo que se va a apuntar, con su coste.
  - «Subir partes» para meter fotos sin WhatsApp: se leen con la IA y, si no hay clave, se rellenan a mano.
  - Teléfono de WhatsApp y jornada de contrato en Ajustes → Trabajadores.
  - Cifra «Partes de trabajo por revisar» en la portada.
- **Primer parte real** (Mercadona, Madrid, 02/07/2026):
  - Se lee bien: nombres, trabajos, material y mediciones. Dos fallos, corregidos por Saúl: un 2 leído como 1 en la fecha, y los «4» eran horas extra, no ordinarias (HORAS vacía = la jornada). La IA ya aplica las dos cosas: la jornada y comparar las cifras dudosas con otras de la misma mano. Saúl no puede pasar más partes por privacidad.
  - Enseñó tres cosas, ya recogidas: no escriben el código de obra (se casa por cliente y localidad, y si hay dos parecidas se pregunta), usan comillas para repetir lo de arriba, y en «Croquis/mediciones» hay medidas (campo `mediciones`).
  - **Conviene pedir a los trabajadores que escriban siempre el código de obra.**
- **Coste:**
  - WhatsApp: gratis, porque escribe el trabajador y se le contesta en las 24 h siguientes.
  - IA: unos céntimos por hoja (por cada lectura o corrección). La API de Anthropic no tiene versión gratuita: es de prepago y se le pone un tope de gasto mensual.
- **Puesta en marcha** (lo hace Saúl o IMTEX; Claude no crea cuentas ni toca claves):
  1. **Anthropic:**
     - En console.anthropic.com, cuenta (de IMTEX o de extreweb), saldo y un límite de gasto mensual.
     - Crear una clave y guardarla con `npx supabase secrets set ANTHROPIC_API_KEY=…`.
     - Con eso ya funciona «Subir partes» en el CRM, sin WhatsApp.
  2. **Meta:**
     - Cuenta de Meta Business de IMTEX verificada (la verificación puede tardar días).
     - En developers.facebook.com, una app de tipo empresa con el producto WhatsApp.
     - Un número para la API. Puede ser nuevo o el WhatsApp Business que ya tengan, si Meta permite usarlo a la vez en la app (coexistencia).
     - Mientras tanto, la app trae un número de pruebas que puede escribir a hasta 5 móviles verificados.
  3. **Secrets** (`supabase/functions/.env.example`):
     - `WHATSAPP_TOKEN`: token permanente de un usuario del sistema de Meta Business.
     - `WHATSAPP_NUMERO_ID`: el identificador del número, no el número.
     - `WHATSAPP_SECRETO_APP`: Configuración de la app → Básica.
     - `WHATSAPP_TOKEN_VERIFICACION`: un texto que nos inventamos.
  4. **Webhook en Meta** (WhatsApp → Configuración):
     - URL `https://<proyecto>.supabase.co/functions/v1/whatsapp`, con el mismo token de verificación.
     - Suscribirse a `messages`.
  5. **Teléfonos y prueba:** poner los teléfonos en Ajustes → Trabajadores y mandar una foto desde uno de ellos.
  6. **Producción:** lo mismo contra `imtex-prod`. Desplegar con `npx supabase functions deploy whatsapp --use-api` y `… leer-parte --use-api`; el `config.toml` ya les quita la verificación JWT.
- **La foto queda siempre:** se guarda antes de leerla, así que se conserva aunque la IA falle o diga que no es un parte. No se puede borrar ni sustituir, y se ve en la ficha del parte, enlazada desde cada apunte del control de obra que salió de él.
- **Límites conocidos:**
  - Solo fotos (un PDF o un audio se contestan con la ayuda).
  - La conversación tiene que seguir dentro de las 24 h desde el último mensaje del trabajador.
  - Lo que no se confirma se queda pendiente en la bandeja.
  - Las pantallas nuevas no las ha podido ver Claude, porque hace falta entrar con un usuario.

## Pendiente

**De Saúl, ahora: probar lo que no ha visto con la sesión iniciada.** Claude no puede entrar con los usuarios, así que las pantallas de los puntos 5 a 8 solo están comprobadas con tests y con los datos de dev. Los pasos están en «Qué probar».

**Decisiones que faltan**
- Cuándo se borra la obra de ejemplo `EJEMPLO-OB-2026-01` de dev. Es ficticia e infla las cifras de la portada.
- Si las ampliaciones (avisos, cierre de meses, exportación y bajas) se le facturan a IMTEX.
- Qué otros cargos, además de gerencia y administración, ven las bajas de todos. Es una fila en `permisos_rol`, con migración.

**Del CRM, para ponerlo en producción** (PLAN.md, parte C y hitos H4 y H5)
- Netlify: crear el sitio `imtex-crm` con base `crm/` y sus variables de entorno.
- Resend: dominio de envío `avisos.imtexsl.com` y SMTP en Supabase Auth. Sin esto, las invitaciones solo llegan a emails del equipo de Supabase. Hace falta acceso al DNS de `imtexsl.com`.
- Plantillas de correo de invitación y recuperación en español.
- Proyecto Supabase de producción (`imtex-prod`, plan Pro): aplicar migraciones, desactivar el registro público, activar la protección de contraseñas filtradas y dar de alta al primer usuario de gerencia. Los pasos están en `CLAUDE.md`.
- Dominio `gestion.imtexsl.com`.
- App instalable (PWA): manifest e iconos.
- Copias de seguridad externas semanales.
- Carga de datos reales: categorías, tarifas, obras en curso y usuarios. Formación y guía rápida por perfil.
- Contrato de encargado del tratamiento (RGPD) firmado antes de cargar datos personales. Con las bajas, el programa guarda **datos de salud** (categoría especial): el contrato tiene que decirlo.
- Avisar a IMTEX: desde abril de 2023 el servicio de salud comunica los partes a la empresa por vía telemática y el trabajador ya no está obligado a entregar el papel. El apartado de bajas sirve como archivo interno.

**Partes por WhatsApp, para ponerlos en marcha** (punto 13)
- Cuentas: Meta Business con el número de WhatsApp y API de Anthropic con saldo y tope de gasto.
- Decidir si esta ampliación se le factura a IMTEX.
- Pedir a la cuadrilla que escriba siempre el código de obra en el parte.
- Más partes reales de distintos trabajadores para afinar la lectura.

**Ampliación aprobada que espera**
- Seguimiento comercial de presupuestos (envío por correo, recordatorios y versiones): se hace cuando esté Resend.

**Mejoras técnicas propuestas por Claude, sin hacer**
- Comprobaciones automáticas en GitHub (build, lint y tests en cada PR).
- Proteger en la base de datos los presupuestos enviados y aceptados: hoy solo lo impide la pantalla.
- Guardar quién modificó cada apunte y el valor anterior.
- Tablet en vertical (768 px o más): los botones y las casillas tienen el tamaño de escritorio (32 px). Si IMTEX va a usar tablets, se agrandan según el tipo de puntero (`pointer-coarse`) en vez de según el ancho.
- Cargar los gráficos solo al entrar en Control de obra: el JavaScript pesa 1,3 MB.
- Pruebas de recorrido completo con un usuario de prueba.
- Actualizar las dependencias de `web/`: `npm audit` da 15 avisos altos, casi todos en las herramientas de desarrollo local del adaptador de Netlify. No llegan a la web publicada.

**Web corporativa, para ponerla en producción** (PLAN.md C1). El desarrollo está hecho (punto 12 de «Hecho»).
- Visto bueno de Saúl y de IMTEX a textos, fotos y legales.
- Netlify: sitio `imtex-web` con base `web/` y sus variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACTO_EMAIL_DESTINO`).
- Resend: sin la cuenta y el dominio de envío, el formulario no manda correos.
- Galería en producción: repetir la importación de las 22 obras contra `imtex-prod`.
- Lighthouse en móvil ≥ 90: en local da 94–99 sin la galería. Falta medir `/obras` y las fichas con las fotos, y repetirlo en Netlify. Revisión en un iPhone.
- En el primer despliegue de Netlify: comprobar que `/empresa` responde 200 sin redirigir y que la canónica coincide con la dirección.
- DNS (solo los registros de la web; el MX no se toca), SSL y Search Console.
- Material que hay que pedir a IMTEX: logo en vector, fotos de obras a buena resolución, datos del Registro Mercantil y acceso al DNS.

**Tienda online**
- Aparcada. La llevará Pedro, fuera de este repo.

**Fuera del alcance vendido** (se presupuesta aparte si IMTEX lo pide)
- Que cada operario meta sus propias horas, facturación y Verifactu, modo sin conexión e idiomas.

## Cómo arrancar en otro ordenador

Hace falta Git, Node 22 o superior y Claude Code.

**Si el repo ya está en ese ordenador**, basta con traer la rama e instalar lo nuevo:
```bash
git fetch && git checkout feat/web-realista && git pull
```
```bash
cd crm && npm install
```
```bash
cd web && npm install
```
Si en ese ordenador no existe `web/.env`, créalo copiando `web/.env.example` y rellena las dos primeras líneas con los mismos valores que `crm/.env` (la URL y la clave publicable; solo cambia el prefijo, `PUBLIC_` en vez de `VITE_`). Claude puede hacerlo si se lo pides. Sin ese fichero la web arranca, pero no salen las obras.

**Si se empieza de cero:**
1. Clonar el repo y cambiar a la rama de trabajo:
   ```bash
   git clone https://github.com/ContactoExtreweb/Imtex.git
   ```
   ```bash
   cd Imtex && git checkout feat/web-realista
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
6. Arrancar la web y abrir http://localhost:4321 (en otra terminal; pueden estar los dos a la vez):
   ```bash
   cd web && npm run dev
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

**Bajas**
1. Ajustes → Trabajadores: abre (o crea) tu ficha y en «Usuario del programa» elige tu usuario. Haz lo mismo con una ficha para `encargado@prueba.es`.
2. Como gerencia, entra en **Bajas**. Debe haber dos pestañas: «Mis papeles» y «De todos los trabajadores».
3. En «Mis papeles», elige «Parte de baja» y sube una foto desde el móvil, un PDF y un Word. Cada uno debe aparecer arriba con la fecha y la hora. Tócalos: la foto y el PDF se abren, el Word se descarga con su nombre.
4. Prueba un archivo no admitido (un Excel) y uno de más de 25 MB: debe decir por qué no lo sube.
5. En «De todos los trabajadores», pulsa **Subir papel**, elige un trabajador sin usuario y sube algo. Debe salir «Subido … por» con tu nombre.
6. Entra como `encargado@prueba.es`: solo ve sus papeles, puede subir y borrar los suyos, y no ve la pestaña de todos. Si gerencia le subió uno en su nombre, lo ve pero no tiene papelera.
7. Como gerencia, borra un papel. Intenta borrar en Ajustes una ficha de trabajador con papeles: no debe dejar.

**Partes de trabajo** (sin clave de Anthropic, la IA no lee: se rellena a mano)
1. Ajustes → Trabajadores: pon un móvil en una ficha («600 11 22 33») y comprueba que sale en el listado como «+34 600 11 22 33». Un número mal escrito debe dar error. Mira también la «Jornada de contrato» (8 por defecto).
2. **Partes de trabajo → Subir partes** y elige la foto del parte de Mercadona. Avisará de que no se ha podido leer y abrirá su ficha.
3. Pulsa **Girar** hasta verla derecha y **Abrir entera** para ampliarla.
4. Rellénala: obra «Obra Prueba», fecha, dos trabajadores con categoría y sus horas, y unos km. Abajo debe decir cuántas horas y km se van a apuntar y su coste.
5. **Apuntar en el control de obra**. En la obra, Personal y Combustible deben tener las líneas nuevas con el enlace «Parte», que lleva a la foto. El parte pasa a «Apuntados» y ya no se puede editar.
6. Sube otro y prueba a apuntarlo con un trabajador sin categoría, con 18 horas o en un mes cerrado: debe avisar y no apuntar nada.
7. Descarta uno y recupéralo desde «Descartados».
8. En la portada debe salir «Partes de trabajo por revisar». El encargado ve la bandeja y puede apuntar; oficina técnica solo mira.

**Web pública** (`cd web && npm run dev`, http://localhost:4321)
1. Portada: baja despacio y mira las seis fases de la maqueta 3D. Gírala arrastrando. Recarga la página a media lectura: debe aparecer ya en esa fase.
2. Cambia al tema claro con el botón del sol y recarga: debe recordarlo. Vuelve al oscuro.
3. Obras: filtra por servicio, abre una obra (la foto debe «viajar» a la ficha en Chrome o Edge), abre el visor de fotos y pasa con las flechas.
4. En el CRM, despublica una obra y comprueba que desaparece de la web (tarda hasta 5 minutos en producción; en local, al recargar).
5. Contacto: envía el formulario vacío, con un email mal escrito y bien relleno. Sin clave de Resend debe decir que aún no está conectado.
6. Pruébalo todo en el móvil (`npm run dev -- --host` y la dirección de red).
7. Escribe una dirección que no exista (`/obras/no-existe`): debe salir la página 404 de la web.
8. En el móvil, abre el menú: el logo se destapa y los enlaces entran en cascada; la página de detrás no se mueve. Baja por empresa, obras o particulares: cada bloque entra una sola vez.
9. Mira el objeto 3D de la entrada de Servicios, Obras, Empresa, Particulares y Contacto durante una vuelta entera, en el ordenador y en el móvil. En Servicios, pasa el ratón por la leyenda. En Obras, pulsa el nombre de la obra encendida.

## Cómo seguir con Claude

Abre Claude Code en la carpeta del repo y dile qué quieres. Ejemplos:
- «Lee `docs/ESTADO.md` y dime por dónde vamos.»
- «He probado control de obra y falla esto: …»
- «Fusiona `feat/bajas` en `main`.» Esa rama lo incluye todo.
- «He visto la web y cambiaría esto: …»

Cómo se ha trabajado hasta ahora, por si Claude no lo recuerda en ese ordenador:
- Todo en una misma conversación, encadenando los bloques del plan.
- No hay reunión de arranque con IMTEX: las dudas se resuelven con la propuesta del plan y se anotan en `decisiones.md`.
- Antes de cada bloque grande, Claude enseña un plan y espera el visto bueno.
- Git lo lleva Claude: commits pequeños en español, una rama por bloque.
- Claude no crea usuarios ni escribe contraseñas: eso lo hace Saúl en el panel de Supabase.
- Se trabaja desde dos ordenadores (casa y oficina). Al terminar cada bloque se actualiza este documento y se sube la rama.

## Trampas conocidas

- **Si la web se ve sin estilos en alguna página nueva, o la maqueta 3D no carga** (en la consola sale «504 Outdated Optimize Dep»), para el servidor, borra `web/node_modules/.vite` y vuelve a arrancar. Pasa al añadir páginas o dependencias con el servidor en marcha.
- **No arranques dos servidores de la web a la vez** en la misma carpeta: se pisan y se quedan colgados.
- **En local, una dirección con barra final da 404** (`/empresa/`). Es lo esperado: las direcciones van sin barra (`trailingSlash: 'never'`).
- **Blender en la sesión de Claude en la nube** no viene instalado: se baja de `download.blender.org` (`Blender5.2/blender-5.2.2-linux-x64.tar.xz`) a `/opt/blender` y se enlaza en `/usr/local/bin/blender`. Los recursos del render se bajan con `cd web && node render/recursos.mjs`. Allí renderiza con el procesador.
- **En un equipo sin tarjeta gráfica no sale el 3D**, sino la foto. Para verlo igualmente: `localStorage.setItem('forzar-3d', 'si')` en la consola, y `localStorage.removeItem('forzar-3d')` para volver.

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
