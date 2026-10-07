// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  // Las direcciones van sin barra al final, como en los enlaces, el sitemap y las canónicas.
  // Las páginas estáticas salen como empresa.html (no empresa/index.html), que Netlify sirve en /empresa.
  trailingSlash: 'never',
  build: {
    format: 'file'
  },

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: netlify()
});
