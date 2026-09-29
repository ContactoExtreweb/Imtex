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
