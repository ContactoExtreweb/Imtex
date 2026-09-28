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
- CRM: `cd crm && npm run dev` · `npm run build` · `npm test` · `npm run lint`
- Nueva migración: `npx supabase migration new <nombre>`
- Aplicar migraciones: `npx supabase db push` (enlazado a imtex-dev; producción solo si se pide)
- Tipos: `npx supabase gen types typescript --linked > crm/src/lib/database.types.ts` (y copia en `web/src/lib/`)
- Prueba de permisos por rol (solo dev, debe dar 0 fallos): `npx supabase db query --linked -f supabase/pruebas/permisos.sql`. Tabla nueva → añade sus casos en ese fichero.
- Advisors de seguridad y rendimiento: `npx supabase db advisors --linked --type all`

## Reglas
1. Alcance: solo lo de `docs/PLAN.md` §0. Si algo no está, avisa de que es una ampliación antes de hacerlo.
2. Nada de facturación ni Verifactu: el CRM no emite facturas.
3. RLS activado en todas las tablas, con permisos vía `private.tiene_permiso(modulo, accion)` (esquema no expuesto por la API). La clave secreta de Supabase nunca va en código del navegador. Registro público desactivado.
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
