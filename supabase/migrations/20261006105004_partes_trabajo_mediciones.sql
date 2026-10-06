-- Partes en papel: el recuadro CROQUIS/MEDICIONES también lleva texto útil (m² por estancia),
-- como se vio en el primer parte real (06/10/2026). El dibujo se queda en la foto.
alter table public.partes_trabajo add column mediciones text;
