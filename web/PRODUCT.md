# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Principal: técnicos y empresas.** Jefes de obra y de compras de constructoras, ingenierías, industria, administraciones públicas y comunidades de regantes. Llegan con una obra concreta (una cubierta, un depósito, una estructura dañada, una balsa) y comprueban si IMTEX es solvente antes de pedir oferta: qué ha hecho, para quién, con qué sistemas y qué acreditaciones tiene. Confirmado por Saúl el 02/10/2026.
- **Secundario: particulares y comunidades de vecinos**, con un problema concreto (humedades, una terraza, un garaje). Tienen un apartado sencillo; no marcan el tono de la web.

## Product Purpose

Web corporativa de IMTEX S.L. (Impermeabilizaciones y Montajes Extremeños), de Villanueva de la Serena (Badajoz). Sustituye a la web Joomla actual de imtexsl.com. Tiene que demostrar la solvencia de la empresa con sus obras y acreditaciones, y hacer fácil pedir presupuesto por teléfono, email o formulario.

Éxito: un técnico que no conoce IMTEX entiende en segundos qué hace, ve obras comparables a la suya y contacta.

## Positioning

Empresa aplicadora especializada, con más de 25 años, que ha trabajado en obras de primer nivel fuera de su región: la Central Nuclear de Almaraz, los aeropuertos de Sevilla y Bilbao, el transvase Tajo-Segura, la ETAP de Torrelaguna, Bodegas Williams & Humbert, Mercadona, Obramat en Lisboa. Homologada como aplicadora por los fabricantes y con calidad y medio ambiente certificados. La prueba son las obras, con fechas, lugares y sistemas concretos.

## Operating Context

- Servicios: impermeabilización (poliurea y poliuretano proyectados en caliente, láminas de PVC, TPO, EPDM, PEAD y bituminosas, morteros impermeables); reparación, refuerzo y protección de estructuras de hormigón (morteros según UNE-EN 1504, fibra de carbono); resinas epoxi y poliuretano (protección y pavimentos continuos); otros trabajos.
- La galería de obras se gestiona desde el programa de gestión (CRM): IMTEX publica una obra con sus fotos y aparece en la web al momento. La web solo lee lo publicado.
- Se consulta a menudo desde el móvil, en obra o en oficina.

## Capabilities and Constraints

- Astro con Tailwind en Netlify. Las páginas de obras se generan bajo demanda; el resto es estático.
- Solo español. Las URLs antiguas de Joomla redirigen con 301.
- Sin analítica ni cookies de terceros.
- Formulario de contacto con envío por Resend (cuenta pendiente).
- Lighthouse en móvil ≥ 90.
- Rutas: inicio, empresa, servicios y sus cuatro fichas, obras y ficha de obra, particulares, contacto y legales.
- Pendiente de IMTEX: logo en vector, fotos a mayor resolución, datos del Registro Mercantil, permiso para usar logotipos de fabricantes.

## Brand Commitments

- Nombre: IMTEX. Lema: «Soluciones técnicas para industria y construcción».
- Identidad de 2026 (docs/marca-imtex.jpg): logotipo negro con arco y acento rojos; rojo `#ff311e`, negro `#131116`, gris pizarra `#444556`; el lema en una banda roja inclinada con letra condensada en mayúsculas; franjas diagonales rojas y grises en una esquina.
- Recursos: `crm/src/assets/logo-imtex.png`, `logo-imtex-claro.png` (para fondo oscuro) y `lema-imtex.png`.
- El rojo puro no sirve para texto pequeño sobre blanco (3,7:1).
- Contacto: Pol. Ind. Cagancha, parcela 31, 06700 Villanueva de la Serena · 924 84 12 46 · imtex@imtexsl.com · YouTube `@imtexsl` · LinkedIn `/company/imtexsl`.
- No puede parecer anticuada ni descuidada: es justo lo que le pasa a la web actual.

## Evidence on Hand

- 22 obras de referencia con texto y fotos (1.000×600 px) en la web actual; lista en `docs/PLAN.md` B6.
- Fabricantes que homologan a IMTEX como aplicador: SIKA, Drizoro, Renolit, Soprema y Danosa. Solo el nombre, sin logotipo, hasta tener permiso.
- Miembro del Club DIR.
- ISO 9001 e ISO 14001 certificadas por OCA Global. Clasificación de empresa C041, C072, E074 y G063.
- CIF B06256861.
- No hay testimonios, cifras de facturación, número de empleados ni fotos de equipo: no se inventan.

## Product Principles

- Las obras son la prueba: cada afirmación se apoya en una obra, un sistema o una acreditación.
- Lenguaje de técnico a técnico: sistemas, normas y materiales por su nombre, sin adjetivos de relleno.
- El contacto siempre a un toque.
- Lo que IMTEX publica en el CRM es lo que se ve: la web no necesita a nadie para estar al día.

## Accessibility & Inclusion

WCAG 2.1 AA: contraste, foco visible, navegación con teclado y movimiento reducido cuando el visitante lo pide.
