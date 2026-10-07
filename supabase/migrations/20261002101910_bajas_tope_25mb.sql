-- Bajas: el tope por archivo sube de 10 a 25 MB (un PDF escaneado de varias páginas pasa de 10).
-- El mismo número está en crm/src/lib/bajas.ts (MAX_MB).
update storage.buckets set file_size_limit = 25 * 1024 * 1024 where id = 'bajas';
