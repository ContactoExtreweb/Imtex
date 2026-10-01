# Registro de decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 28/09/2026 | Astro 7 en lugar del 6 que indica el plan | Es la versión estable al crear el repo; el adaptador de Netlify y Tailwind 4 funcionan con ella |
| 28/09/2026 | CRM con Vite 8, TypeScript 6, oxlint y Vitest 5 | Lo que trae la plantilla oficial de Vite; oxlint sustituye a ESLint sin configuración extra |
| 28/09/2026 | shadcn/ui con base Radix y preset Nova (Geist, iconos Lucide) | Radix es la base con más componentes y ejemplos; el aspecto se ajustará con la identidad de IMTEX |
| 28/09/2026 | Registro público desactivado (en `supabase/config.toml` y en el panel de imtex-dev) y contraseña mínima de 8 caracteres | Regla 3 de CLAUDE.md: altas solo por invitación. `config.toml` solo aplica en local; en cada proyecto remoto se desactiva en el panel |
| 28/09/2026 | Roles y matriz de permisos dentro de la migración `nucleo`, no en `seed.sql` | `seed.sql` solo se ejecuta en local; estos datos hacen falta en dev y en producción |
| 28/09/2026 | `tiene_permiso` en el esquema `private`, no en `public` | Es security definer: en `public` la API la expone por `/rpc` y el Security Advisor avisa (lint 0029) |
| 28/09/2026 | Módulos `usuarios` y `ajustes` separados (en B5 van en la misma fila), con los mismos permisos: solo gerencia | `invitar-usuario` mira `usuarios`; categorías, tarifas de combustible y trabajadores miran `ajustes` |
| 28/09/2026 | Categorías, tarifas de combustible y trabajadores se leen con `ajustes:ver` o `control_obra:ver`; cada uno ve además su propia ficha de trabajador | El control de obra necesita los precios por hora y el coste por km; el operario no ve las tarifas |
| 28/09/2026 | Estados de obra `en_ejecucion` y `terminada`; `tarifas_combustible` con una sola fila (1,45 €/L; 8 y 26 L/100 km) | Son los de `referencia/IMTEX_control_obra.html` |
| 28/09/2026 | `obras.presupuesto_id` se añade en el prompt 6 | La tabla `presupuestos` aún no existe |
| 28/09/2026 | Prueba de permisos en SQL (`supabase/pruebas/permisos.sql`), lanzada con `db query --linked` y deshecha al terminar | No necesita claves secretas ni deja usuarios; lo esperado sale de `permisos_rol` |
| 29/09/2026 | No hay reunión de arranque: las dudas de PLAN.md A5 se deciden con la propuesta del plan | El presupuesto está aceptado y hay que producir ya |
| 29/09/2026 | Matriz de permisos: la de B5 tal cual. Trabajadores los da de alta gerencia (`ajustes`); el operario no ve tarifas | Propuesta del plan; se cambia con una migración si IMTEX lo pide |
| 29/09/2026 | El coste de cada línea se copia al añadirla al presupuesto; los borradores tienen «Actualizar con la base de precios» | Propuesta de B4: un cambio de precios no altera presupuestos enviados |
| 29/09/2026 | CRM en `gestion.imtexsl.com` | Sin coste de dominio nuevo; solo requiere un CNAME en su DNS |
| 29/09/2026 | Orden: todo el CRM primero (acceso, presupuestos, control de obra) y después la web. La web se retrasa respecto al calendario de PLAN.md §0 (revisión 12/10, producción 19/10) | Prioridad a los programas funcionales |
| 29/09/2026 | Tienda online aparcada; la llevará Pedro fuera de este repo | Decisión de Saúl |
| 29/09/2026 | Supabase Auth con flujo implícito en el CRM | Los enlaces de invitación los genera el servidor y no pueden usar PKCE |
| 29/09/2026 | `invitar-usuario` con `verify_jwt = false`: la función comprueba la sesión y el permiso `usuarios:editar` | La verificación JWT de la pasarela no es compatible con las claves nuevas de Supabase |
| 29/09/2026 | Los usuarios no se borran, se desactivan; nadie puede cambiarse su propio rol ni desactivarse | Se conserva quién hizo cada cosa y nadie se queda sin acceso por error |
| 29/09/2026 | Desplegables y casillas nativos en lugar de Select/Switch de shadcn | En el iPhone abren el selector del sistema y funcionan con React Hook Form sin adaptadores |
| 29/09/2026 | Los campos numéricos aceptan coma o punto decimal («18,50» o «18.5») | En el móvil en español se escribe con coma |
| 29/09/2026 | Lint sin `src/components/ui` ni `src/hooks` | Es código que genera y actualiza la CLI de shadcn |
| 29/09/2026 | PWA (manifest e iconos) pendiente | Necesita el logo de IMTEX |
| 01/10/2026 | La migración `presupuestos` carga los 90 precios de la plantilla de IMTEX (las 30 filas vacías se descartan) | Hacen falta también en producción; la plantilla se da por vigente al no haber reunión |
| 01/10/2026 | Porcentajes por defecto de un presupuesto: 16 % de gastos generales y 35 % de beneficio (B4 decía 13 % y 6 %); carta y condiciones, las de la plantilla | Son los valores que IMTEX tiene configurados en su herramienta |
| 01/10/2026 | Un presupuesto se guarda entero con la función `guardar_presupuesto` (cabecera, partidas y líneas en una transacción) y solo si es un borrador | Un fallo a medias no puede dejarlo sin partidas; los enviados y aceptados no se tocan |
| 01/10/2026 | En cada línea del presupuesto se copian código, descripción, unidad y coste; las partidas tipo guardan solo la referencia al precio | Lo decidido el 29/09: los presupuestos no cambian con la base de precios; las plantillas sí usan el precio vigente |
| 01/10/2026 | Totales del listado con la vista SQL `presupuestos_totales`; dentro del editor, con las funciones de `calculos/presupuesto.ts` | Regla 7 (sumas en SQL). Las dos dan lo mismo con el ejemplo de la herramienta (2.787,70 € de base) |
| 01/10/2026 | El enlace obra–presupuesto va solo en `obras.presupuesto_id` (B4 lo ponía también en `presupuestos.obra_id`) | Un único sitio que mantener; una obra por presupuesto |
| 01/10/2026 | El test de cálculos ejecuta las funciones originales sacadas de `referencia/IMTEX_plantilla_presupuestos.html` | Comprueba la igualdad con la herramienta real, no con una copia de sus fórmulas |
| 01/10/2026 | Los precios usados en partidas tipo no se pueden borrar: se desactivan | Así no se rompen las plantillas |
| 01/10/2026 | Identidad de IMTEX en el CRM, sacada del manual de marca (`docs/marca-imtex.jpg`): rojo `#ff311e`, negro `#131116` y gris azulado `#444556`. Logo, lema, sellos de OCA e icono recortados del PDF a 5.672 px, con fondo transparente (`crm/src/assets/`) | El PDF es una imagen plana; no hay logo en vector. Cuando IMTEX lo pase en SVG, se sustituyen los PNG |
| 01/10/2026 | Reparto del color: menú lateral sobre el negro de la marca; rojo para la acción principal, la selección y el foco; neutros con un punto del gris azulado | Herramienta de trabajo: el color marca acción y estado, no decora. La marca completa (logo, lema y franjas) va en el login |
| 01/10/2026 | Botones en rojo oscurecido `oklch(0.561 0.21 30)` (texto blanco a 5,15:1). El rojo puro queda para logo, iconos, subrayados y foco | El rojo puro con texto blanco se queda en 3,7:1, por debajo del 4,5:1 de WCAG AA |
| 01/10/2026 | Los estados no usan el rojo de marca: aceptado y terminada en verde, rechazado en el rojo de error, el resto en neutro | Un estado «aceptado» en rojo se leería como un problema |
| 01/10/2026 | Campos y botones de 40 px de alto en móvil y 32 px en escritorio (se han tocado `button.tsx` e `input.tsx` de shadcn) | Regla 8: pensado primero para el móvil; 32 px es poco para el dedo |
| 01/10/2026 | El presupuesto impreso usa el logo y los colores nuevos | La marca nueva sustituye a la de la herramienta antigua |
| 01/10/2026 | Teléfono de IMTEX: 924 84 12 46 (el de la marca nueva; la plantilla antigua tenía 924 84 42 02) | Confirmado por Saúl |
| 01/10/2026 | La portada muestra un resumen según los permisos de cada usuario (cifras, obras en ejecución y últimos presupuestos), no un panel escrito a mano por rol | Si cambia la matriz de permisos, la portada cambia sola. Las cifras se cuentan en SQL (regla 7) |
| 01/10/2026 | Notas rápidas en la portada, guardadas en la tabla `notas`; cada usuario ve solo las suyas (RLS por dueño, sin módulo de permisos) | Pedido por Saúl. No está en PLAN.md §0: es una ampliación pequeña asumida. En base de datos y no en el navegador, para verlas igual en el móvil y en el PC |
| 01/10/2026 | Portada: resumen, accesos a los apartados y notas. En escritorio, el logo va grande y muy tenue (7 %) de fondo en todas las pantallas | Pedido por Saúl, para que se note la identidad |
| 01/10/2026 | El presupuesto impreso lleva solo el logo de IMTEX y el contacto, sin lema ni sellos de OCA | Pedido por Saúl |
