// Datos de IMTEX que se repiten por la web. Lo que está pendiente de confirmar con IMTEX
// está apuntado en docs/ESTADO.md.

export const EMPRESA = {
  nombre: 'IMTEX',
  razonSocial: 'IMTEX S.L.',
  nombreLargo: 'Impermeabilizaciones y Montajes Extremeños',
  cif: 'B06256861',
  lema: 'Soluciones técnicas para industria y construcción',
  direccion: 'Pol. Ind. Cagancha, parcela 31',
  cp: '06700',
  localidad: 'Villanueva de la Serena',
  provincia: 'Badajoz',
  telefono: '924 84 12 46',
  telefonoEnlace: 'tel:+34924841246',
  email: 'imtex@imtexsl.com',
  youtube: 'https://www.youtube.com/@imtexsl',
  linkedin: 'https://www.linkedin.com/company/imtexsl',
  mapa: 'https://www.google.com/maps/search/?api=1&query=IMTEX+Pol%C3%ADgono+Industrial+Cagancha+Villanueva+de+la+Serena',
  dominio: 'https://www.imtexsl.com',
} as const

/** Fabricantes que homologan a IMTEX como aplicador. Solo el nombre: sin permiso no se usan sus logotipos. */
export const FABRICANTES = ['SIKA', 'Drizoro', 'Renolit', 'Soprema', 'Danosa'] as const

/** Clasificación de empresa para la ejecución de obras */
export const CLASIFICACION = ['C041', 'C072', 'E074', 'G063'] as const

export const NAVEGACION = [
  { a: '/servicios', texto: 'Servicios' },
  { a: '/obras', texto: 'Obras' },
  { a: '/empresa', texto: 'Empresa' },
  { a: '/particulares', texto: 'Particulares' },
  { a: '/contacto', texto: 'Contacto' },
] as const

/** La dirección de la página tal como se enlaza: sin «.html» ni barra final. Las estáticas se generan como
 *  empresa.html (astro.config.mjs) y al compilarlas Astro.url lleva ese «.html»; y Netlify sirve también /obras/. */
export const rutaDe = (url: URL) => url.pathname.replace(/\.html$/, '').replace(/(.)\/+$/, '$1')

/** Los cuatro servicios, con lo que la web actual dice de cada uno. `categoria` es la de la galería. */
export const SERVICIOS = [
  {
    slug: 'impermeabilizacion',
    categoria: 'impermeabilizacion',
    nombre: 'Impermeabilización',
    resumen: 'Cubiertas, depósitos, balsas, canales y estructuras, con el sistema que pide cada soporte.',
    sistemas: [
      'Poliurea y poliuretano bicomponente proyectados en caliente',
      'Revestimientos flexibles de resina epoxi y poliuretano aplicados en frío',
      'Láminas bituminosas y sintéticas: PVC, TPO, EPDM',
      'Láminas de PEAD en canales y balsas',
      'Morteros impermeables en depósitos y vasos de piscina',
      'Imprimaciones y emulsiones bituminosas en estructuras de hormigón',
    ],
  },
  {
    slug: 'reparacion-y-refuerzo',
    categoria: 'reparacion_refuerzo',
    nombre: 'Reparación y refuerzo',
    resumen: 'Estructuras de hormigón reparadas según UNE-EN 1504 y reforzadas con fibra de carbono.',
    sistemas: [
      'Reparación con morteros de altas prestaciones según UNE-EN 1504',
      'Refuerzo con fibra de carbono: tejido y laminado',
      'Pasivación de armaduras y protección frente a la carbonatación',
    ],
  },
  {
    slug: 'resinas-epoxi-y-poliuretano',
    categoria: 'resinas',
    nombre: 'Resinas epoxi y poliuretano',
    resumen: 'Pavimentos continuos, inyecciones y protección química para industria y construcción.',
    sistemas: [
      'Pavimentos continuos de resina epoxi, poliuretano y sintéticos: industriales, decorativos y deportivos',
      'Inyecciones consolidantes y acuarreactivas con resinas epoxi y poliuretano',
      'Protección de alta resistencia química en cubetos y balsas de vertido de emergencia',
    ],
  },
  {
    slug: 'otros-trabajos',
    categoria: 'otros',
    nombre: 'Otros trabajos',
    resumen: 'Juntas de dilatación, taladros en hormigón y piscinas con lámina de PVC.',
    sistemas: [
      'Juntas de dilatación en calzadas: elastoméricas in situ y armadas preformadas',
      'Taladros en hormigón con corona de widia',
      'Piscinas con sistema liner de lámina de PVC',
    ],
  },
] as const

/** Dónde está IMTEX en el mapa: el centro del polígono, según OpenStreetMap (no la parcela exacta) */
export const UBICACION = { lat: 38.968439, lon: -5.8016799 }

/** Datos estructurados de la empresa (schema.org) para la portada y el contacto */
export const NEGOCIO = {
  '@context': 'https://schema.org',
  '@type': 'GeneralContractor',
  '@id': `${EMPRESA.dominio}/#empresa`,
  name: EMPRESA.nombre,
  legalName: EMPRESA.razonSocial,
  alternateName: EMPRESA.nombreLargo,
  slogan: EMPRESA.lema,
  url: EMPRESA.dominio,
  telephone: '+34924841246',
  email: EMPRESA.email,
  vatID: `ES${EMPRESA.cif}`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: EMPRESA.direccion,
    postalCode: EMPRESA.cp,
    addressLocality: EMPRESA.localidad,
    addressRegion: EMPRESA.provincia,
    addressCountry: 'ES',
  },
  geo: { '@type': 'GeoCoordinates', latitude: UBICACION.lat, longitude: UBICACION.lon },
  areaServed: ['ES', 'PT'],
  sameAs: [EMPRESA.linkedin, EMPRESA.youtube],
}
