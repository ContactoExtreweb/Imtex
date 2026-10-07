/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Lo de los partes que comparten el CRM y las Edge Functions vive fuera de crm/
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../supabase/functions/_shared'] } },
})
