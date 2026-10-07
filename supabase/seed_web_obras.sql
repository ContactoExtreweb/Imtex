-- Las 22 obras de referencia de la web antigua, con sus fotos. Generado por web/scripts/importar-obras.mjs.
-- Se puede repetir: no pisa una obra que ya exista con el mismo slug, ni una foto con la misma ruta.
-- Antes hay que subir las fotos al bucket `galeria` (docs/ESTADO.md).

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('inyeccion-sifones-orellana', 'Inyección de sifones', 'Orellana (Badajoz)', '2025', 'reparacion_refuerzo', 'Inyección de mortero fluido para rellenar los huecos entre sifones de acero y solera de hormigón.', 'Relleno de las oquedades que quedaban entre los sifones de acero y la solera de hormigón mediante inyección de mortero fluido.
- Taladros en el sifón y colocación de las mangueras de inyección.
- Inyección de mortero fluido en las oquedades entre el sifón de acero y el hormigón.
- Retirada de los inyectores y tapado de los taladros con mortero de reparación.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Inyección de sifones, Orellana (Badajoz)', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/inyeccion-sifones-orellana/01.jpg', 1000, 600, 1),
  ('obras/inyeccion-sifones-orellana/02.jpg', 1000, 600, 2),
  ('obras/inyeccion-sifones-orellana/03.jpg', 1000, 600, 3),
  ('obras/inyeccion-sifones-orellana/04.jpg', 1000, 600, 4),
  ('obras/inyeccion-sifones-orellana/05.jpg', 1000, 600, 5),
  ('obras/inyeccion-sifones-orellana/06.jpg', 1000, 600, 6)
) as f(ruta, ancho, alto, orden)
where o.slug = 'inyeccion-sifones-orellana'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('balsa-pead-badajoz', 'Balsa PEAD 1,50 mm', 'Badajoz', '2025', 'impermeabilizacion', 'Impermeabilización de una balsa de riego de unos 3.000 m² con lámina de PEAD de 1,5 mm.', 'Impermeabilización de una balsa de riego de unos 3.000 m² con lámina de polietileno de alta densidad (PEAD) de 1,5 mm.
- Fieltro geotextil de 300 g/m².
- Lámina de PEAD de 1,5 mm termosoldada con doble soldadura y máquina automática.
- Remate de los tubos con pletinas de acero inoxidable recibidas con mortero epoxi.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Balsa PEAD 1,50 mm, Badajoz', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/balsa-pead-badajoz/01.jpg', 1000, 600, 1),
  ('obras/balsa-pead-badajoz/02.jpg', 1000, 600, 2),
  ('obras/balsa-pead-badajoz/03.jpg', 1000, 600, 3),
  ('obras/balsa-pead-badajoz/04.jpg', 1000, 600, 4),
  ('obras/balsa-pead-badajoz/05.jpg', 1000, 600, 5),
  ('obras/balsa-pead-badajoz/06.jpg', 1000, 600, 6),
  ('obras/balsa-pead-badajoz/07.jpg', 1000, 600, 7),
  ('obras/balsa-pead-badajoz/08.jpg', 1000, 600, 8),
  ('obras/balsa-pead-badajoz/09.jpg', 1000, 600, 9)
) as f(ruta, ancho, alto, orden)
where o.slug = 'balsa-pead-badajoz'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('etap-torrelaguna', 'E.T.A.P. Torrelaguna', 'Madrid', '2024', 'reparacion_refuerzo', 'Reparación, protección e impermeabilización de tres decantadores de agua bruta de unos 4.000 m² cada uno.', 'Reparación e impermeabilización de los tres decantadores de agua bruta de la E.T.A.P. de Torrelaguna (Madrid), de unos 4.000 m² cada uno.
- Hidrolimpieza a alta presión, hasta 1.000 atm, para eliminar los restos de los tratamientos originales.
- Repicado del hormigón suelto o en mal estado.
- Lijado mecánico y pasivado de las armaduras expuestas.
- Reconstrucción de la geometría original con mortero de reparación estructural de clase R4.
- Tratamiento de las juntas de dilatación con bandas elásticas adheridas con mortero epoxi.
- Inhibidor de corrosión en toda la estructura para mejorar la resistencia a la carbonatación.
- Mortero impermeable bicomponente en toda la superficie.
- Reconstrucción de los carriles de rodadura con mortero epoxi.', true, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'E.T.A.P. Torrelaguna, Madrid', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/etap-torrelaguna/01.jpg', 1000, 600, 1),
  ('obras/etap-torrelaguna/02.jpg', 1000, 600, 2),
  ('obras/etap-torrelaguna/03.jpg', 1000, 600, 3),
  ('obras/etap-torrelaguna/04.jpg', 1000, 600, 4),
  ('obras/etap-torrelaguna/05.jpg', 1000, 600, 5),
  ('obras/etap-torrelaguna/06.jpg', 1000, 600, 6),
  ('obras/etap-torrelaguna/07.jpg', 1000, 600, 7),
  ('obras/etap-torrelaguna/08.jpg', 1000, 600, 8),
  ('obras/etap-torrelaguna/09.jpg', 1000, 600, 9),
  ('obras/etap-torrelaguna/10.jpg', 1000, 600, 10),
  ('obras/etap-torrelaguna/11.jpg', 1000, 600, 11),
  ('obras/etap-torrelaguna/12.jpg', 1000, 600, 12),
  ('obras/etap-torrelaguna/13.jpg', 1000, 600, 13),
  ('obras/etap-torrelaguna/14.jpg', 1000, 600, 14),
  ('obras/etap-torrelaguna/15.jpg', 1000, 600, 15),
  ('obras/etap-torrelaguna/16.jpg', 944, 566, 16)
) as f(ruta, ancho, alto, orden)
where o.slug = 'etap-torrelaguna'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('obramat-carnaxide-lisboa', 'Obramat Carnaxide', 'Lisboa', '2024', 'reparacion_refuerzo', 'Refuerzo de un forjado de hormigón con unos 1.500 m de laminado de fibra de carbono para aumentar su sobrecarga de uso.', 'Reparación y refuerzo de la estructura de hormigón para aumentar su sobrecarga de uso, con unos 1.500 m lineales de laminado de fibra de carbono de 120 mm de ancho y 2,8 mm de espesor.
- Repicado de las partes sueltas y regularización del soporte con mortero de reparación estructural R4.
- Laminado de fibra de carbono de 120 mm de ancho y 2,8 mm de espesor adherido con mortero epoxi.
- Trabajos auxiliares: impermeabilización de cubiertas con lámina asfáltica (1.200 m²) y del aljibe con lámina de PVC (700 m²).', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Obramat Carnaxide, Lisboa', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/obramat-carnaxide-lisboa/01.jpg', 1000, 600, 1),
  ('obras/obramat-carnaxide-lisboa/02.jpg', 1000, 600, 2),
  ('obras/obramat-carnaxide-lisboa/03.jpg', 1000, 600, 3),
  ('obras/obramat-carnaxide-lisboa/04.jpg', 1000, 600, 4),
  ('obras/obramat-carnaxide-lisboa/05.jpg', 1000, 600, 5),
  ('obras/obramat-carnaxide-lisboa/06.jpg', 1000, 600, 6),
  ('obras/obramat-carnaxide-lisboa/07.jpg', 1000, 600, 7),
  ('obras/obramat-carnaxide-lisboa/08.jpg', 1000, 600, 8),
  ('obras/obramat-carnaxide-lisboa/09.jpg', 1000, 600, 9),
  ('obras/obramat-carnaxide-lisboa/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'obramat-carnaxide-lisboa'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('bodegas-williams-humbert', 'Bodegas Williams & Humbert', 'Cádiz', '2017-2024', 'impermeabilizacion', 'Aislamiento e impermeabilización, en varias fases, de una cubierta de bodega de unos 45.000 m² con espuma de poliuretano y poliurea proyectada en caliente.', 'Aislamiento e impermeabilización, en varias fases, de la cubierta de la bodega, de unos 45.000 m², con espuma de poliuretano acabada en poliurea proyectada en caliente.
- Retirada del aislamiento de espuma de poliuretano en mal estado y limpieza de la superficie con agua a presión.
- Tratamiento de juntas con bandas impermeables.
- Espuma de poliuretano proyectada de 45 kg/m³ de densidad.
- Membrana de poliurea proyectada en caliente con equipo especial.
- Revestimiento de terminación de poliuretano alifático, resistente a la radiación UV.', true, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Bodegas Williams & Humbert, Cádiz', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/bodegas-williams-humbert/01.jpg', 1000, 600, 1),
  ('obras/bodegas-williams-humbert/02.jpg', 1000, 600, 2),
  ('obras/bodegas-williams-humbert/03.jpg', 1000, 600, 3),
  ('obras/bodegas-williams-humbert/04.jpg', 1000, 600, 4),
  ('obras/bodegas-williams-humbert/05.jpg', 1000, 600, 5),
  ('obras/bodegas-williams-humbert/06.jpg', 1000, 600, 6)
) as f(ruta, ancho, alto, orden)
where o.slug = 'bodegas-williams-humbert'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('canal-de-las-aves', 'Canal de las Aves', 'Madrid', '2023', 'reparacion_refuerzo', 'Reparación, refuerzo con tejido de fibra de carbono y protección de tres estructuras de hormigón.', 'Reparación, refuerzo y protección de varios acueductos del Canal de las Aves.
- Hidrolimpieza a alta presión, hasta 1.000 atm, para eliminar los restos de los tratamientos originales.
- Repicado del hormigón suelto o en mal estado.
- Lijado mecánico y pasivado de las armaduras expuestas.
- Reconstrucción de la geometría original con mortero de reparación estructural de clase R4, con tejido de fibra de carbono entre capas.
- Terminación exterior con revestimiento anticarbonatación.
- Impermeabilización interior con lámina de PVC.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Canal de las Aves, Madrid', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/canal-de-las-aves/01.jpg', 1000, 600, 1),
  ('obras/canal-de-las-aves/02.jpg', 1000, 600, 2),
  ('obras/canal-de-las-aves/03.jpg', 1000, 600, 3),
  ('obras/canal-de-las-aves/04.jpg', 1000, 600, 4),
  ('obras/canal-de-las-aves/05.jpg', 1000, 600, 5),
  ('obras/canal-de-las-aves/06.jpg', 1000, 600, 6),
  ('obras/canal-de-las-aves/07.jpg', 1000, 600, 7),
  ('obras/canal-de-las-aves/08.jpg', 1000, 600, 8),
  ('obras/canal-de-las-aves/09.jpg', 1000, 600, 9),
  ('obras/canal-de-las-aves/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'canal-de-las-aves'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('estructuras-don-benito-medellin', 'Estructuras Don Benito / Medellín', 'Badajoz', '2023', 'reparacion_refuerzo', 'Reparación y tratamiento anticarbonatación de dos pasos superiores sobre las vías del tren.', 'Reparación y protección de los pasos superiores sobre las vías del tren en Don Benito y Medellín.
- Hidrolimpieza a alta presión, hasta 1.000 atm, para eliminar los restos de los tratamientos originales.
- Repicado del hormigón suelto o en mal estado.
- Lijado mecánico y pasivado de las armaduras expuestas.
- Reconstrucción de la geometría original con mortero de reparación estructural de clase R4.
- Inhibidor de corrosión en toda la estructura para mejorar la resistencia a la carbonatación.
- Mortero impermeable bicomponente en toda la superficie, como tratamiento anticarbonatación exterior.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Estructuras Don Benito / Medellín, Badajoz', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/estructuras-don-benito-medellin/01.jpg', 1000, 600, 1),
  ('obras/estructuras-don-benito-medellin/02.jpg', 1000, 600, 2),
  ('obras/estructuras-don-benito-medellin/03.jpg', 1024, 768, 3),
  ('obras/estructuras-don-benito-medellin/04.jpg', 1000, 600, 4),
  ('obras/estructuras-don-benito-medellin/05.jpg', 1000, 600, 5),
  ('obras/estructuras-don-benito-medellin/06.jpg', 1000, 600, 6),
  ('obras/estructuras-don-benito-medellin/07.jpg', 1000, 600, 7),
  ('obras/estructuras-don-benito-medellin/08.jpg', 1000, 600, 8),
  ('obras/estructuras-don-benito-medellin/09.jpg', 1707, 1280, 9),
  ('obras/estructuras-don-benito-medellin/10.jpg', 1707, 1280, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'estructuras-don-benito-medellin'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('canales-acequias-pead', 'Canales y acequias', 'Badajoz', '2010-actualidad', 'impermeabilizacion', 'Impermeabilización de canales y acequias de riego con lámina de PEAD: unos 300.000 m² en varias campañas.', 'Impermeabilización de canales generales, secundarios y acequias con lámina de PEAD, en varias campañas desde 2010, con una superficie de unos 300.000 m².
- Limpieza del soporte y achique de agua.
- Lámina de PEAD de 2,0 y 1,5 mm en canales principales, secundarios y acequias.
- Sellado del inicio y el final de cada tramo con esponja de neopreno, pletinas de acero inoxidable y mortero epoxi.
- Impermeabilización de los sifones con mortero impermeable.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Canales y acequias, Badajoz', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/canales-acequias-pead/01.jpg', 1000, 600, 1),
  ('obras/canales-acequias-pead/02.jpg', 1000, 600, 2),
  ('obras/canales-acequias-pead/03.jpg', 1000, 600, 3),
  ('obras/canales-acequias-pead/04.jpg', 1000, 600, 4),
  ('obras/canales-acequias-pead/05.jpg', 1000, 600, 5),
  ('obras/canales-acequias-pead/06.jpg', 1000, 600, 6),
  ('obras/canales-acequias-pead/07.jpg', 1000, 600, 7),
  ('obras/canales-acequias-pead/08.jpg', 1000, 600, 8)
) as f(ruta, ancho, alto, orden)
where o.slug = 'canales-acequias-pead'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('cetarsa-caceres', 'CETARSA Talayuela, Navalmoral y Coria', 'Cáceres', '2012-2022', 'impermeabilizacion', 'Impermeabilización de cubiertas y canalones en tres centros, unos 20.000 m² en total, con poliurea proyectada en caliente.', 'Impermeabilización de cubiertas y canalones de distintos tipos en los centros de CETARSA en Talayuela, Navalmoral y Coria, con unos 20.000 m² entre todas las actuaciones.
- Talayuela: espuma de poliuretano, membrana de poliurea y acabado alifático.
- Navalmoral y Coria: poliurea sobre cubiertas de chapa.
- Navalmoral y Coria: canalones con membrana de poliurea y PVC.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'CETARSA Talayuela, Navalmoral y Coria, Cáceres', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/cetarsa-caceres/01.jpg', 1000, 600, 1),
  ('obras/cetarsa-caceres/02.jpg', 1000, 600, 2),
  ('obras/cetarsa-caceres/03.jpg', 1000, 600, 3),
  ('obras/cetarsa-caceres/04.jpg', 1000, 600, 4),
  ('obras/cetarsa-caceres/05.jpg', 1000, 600, 5),
  ('obras/cetarsa-caceres/06.jpg', 1000, 600, 6),
  ('obras/cetarsa-caceres/07.jpg', 1000, 600, 7),
  ('obras/cetarsa-caceres/08.jpg', 1000, 600, 8),
  ('obras/cetarsa-caceres/09.jpg', 1000, 600, 9),
  ('obras/cetarsa-caceres/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'cetarsa-caceres'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('parking-salamanca', 'Refuerzo parking Salamanca', 'Salamanca', '2022', 'reparacion_refuerzo', 'Reconstrucción y refuerzo con laminado de fibra de carbono de un forjado bidireccional dañado por el incendio de un vehículo.', 'Reconstrucción y refuerzo del forjado bidireccional del parking Reyes Católicos de Salamanca tras el incendio accidental de un vehículo.
- Repicado del hormigón dañado hasta llegar al hormigón sano.
- Lijado mecánico y pasivado de las armaduras expuestas.
- Reconstrucción de la geometría original con mortero de reparación estructural de clase R4.
- Laminado de fibra de carbono en dos direcciones adherido con mortero epoxi.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Refuerzo parking Salamanca, Salamanca', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/parking-salamanca/01.jpg', 1000, 600, 1),
  ('obras/parking-salamanca/02.jpg', 1000, 600, 2),
  ('obras/parking-salamanca/03.jpg', 1000, 600, 3),
  ('obras/parking-salamanca/04.jpg', 1000, 600, 4),
  ('obras/parking-salamanca/05.jpg', 1000, 600, 5),
  ('obras/parking-salamanca/06.jpg', 1000, 600, 6),
  ('obras/parking-salamanca/07.jpg', 1000, 600, 7),
  ('obras/parking-salamanca/08.jpg', 1000, 600, 8),
  ('obras/parking-salamanca/09.jpg', 1000, 600, 9),
  ('obras/parking-salamanca/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'parking-salamanca'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('deposito-plasencia', 'Depósito Plasencia', 'Cáceres', '2021', 'impermeabilizacion', 'Impermeabilización de un depósito de agua potable de unos 1.500 m² con lámina de PVC.', 'Impermeabilización de un depósito de unos 1.500 m² con lámina de PVC apta para agua potable.
- Hidrolimpieza a alta presión para eliminar la suciedad y los restos de tratamientos.
- Lámina de PVC de 1,5 mm apta para contacto con agua potable.
- Remate de los tubos con abrazaderas de acero inoxidable y juntas de neopreno.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Depósito Plasencia, Cáceres', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/deposito-plasencia/01.jpg', 1000, 600, 1),
  ('obras/deposito-plasencia/02.jpg', 1000, 600, 2),
  ('obras/deposito-plasencia/03.jpg', 1000, 600, 3),
  ('obras/deposito-plasencia/04.jpg', 1000, 600, 4),
  ('obras/deposito-plasencia/05.jpg', 1000, 600, 5),
  ('obras/deposito-plasencia/06.jpg', 1000, 600, 6),
  ('obras/deposito-plasencia/07.jpg', 1000, 600, 7),
  ('obras/deposito-plasencia/08.jpg', 1000, 600, 8)
) as f(ruta, ancho, alto, orden)
where o.slug = 'deposito-plasencia'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('cc-plaza-mayor-malaga', 'C. C. Plaza Mayor', 'Málaga', '2021', 'impermeabilizacion', 'Impermeabilización de la cubierta del parking, unos 8.000 m², con poliurea proyectada en caliente y acabado transitable.', 'Impermeabilización y acabado de la cubierta del parking del centro comercial Plaza Mayor de Málaga, de unos 8.000 m².
- Desbastado superficial del hormigón existente.
- Medias cañas con mortero, tratamiento de las juntas de dilatación y espatulado de fisuras.
- Membrana de poliurea proyectada en caliente.
- Capa de rodadura deformable sobre la poliurea, apta para peatones y vehículos.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'C. C. Plaza Mayor, Málaga', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/cc-plaza-mayor-malaga/01.jpg', 1000, 600, 1),
  ('obras/cc-plaza-mayor-malaga/02.jpg', 1000, 600, 2),
  ('obras/cc-plaza-mayor-malaga/03.jpg', 1000, 600, 3),
  ('obras/cc-plaza-mayor-malaga/04.jpg', 1000, 600, 4),
  ('obras/cc-plaza-mayor-malaga/05.jpg', 1000, 600, 5),
  ('obras/cc-plaza-mayor-malaga/06.jpg', 1000, 600, 6),
  ('obras/cc-plaza-mayor-malaga/07.jpg', 1000, 600, 7),
  ('obras/cc-plaza-mayor-malaga/08.jpg', 1000, 600, 8),
  ('obras/cc-plaza-mayor-malaga/09.jpg', 1000, 600, 9),
  ('obras/cc-plaza-mayor-malaga/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'cc-plaza-mayor-malaga'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('universidad-linares', 'Universidad de Linares', 'Jaén', '2020', 'impermeabilizacion', 'Impermeabilización de la cubierta del parking, unos 3.500 m², con poliurea proyectada en caliente y acabado transitable.', 'Impermeabilización y acabado de la cubierta del parking del Campus Universitario de Linares, de unos 3.500 m².
- Desbastado superficial del hormigón existente.
- Medias cañas con mortero, tratamiento de las juntas de dilatación y espatulado de fisuras.
- Membrana de poliurea proyectada en caliente.
- Capa de rodadura deformable sobre la poliurea, apta para peatones y vehículos.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Universidad de Linares, Jaén', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/universidad-linares/01.jpg', 1000, 600, 1),
  ('obras/universidad-linares/02.jpg', 1000, 600, 2),
  ('obras/universidad-linares/03.jpg', 1000, 600, 3),
  ('obras/universidad-linares/04.jpg', 1000, 600, 4),
  ('obras/universidad-linares/05.jpg', 1000, 600, 5),
  ('obras/universidad-linares/06.jpg', 1000, 600, 6),
  ('obras/universidad-linares/07.jpg', 1000, 600, 7),
  ('obras/universidad-linares/08.jpg', 1000, 600, 8),
  ('obras/universidad-linares/09.jpg', 1000, 600, 9),
  ('obras/universidad-linares/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'universidad-linares'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('transvase-tajo-segura', 'Transvase Tajo-Segura', 'Cuenca', '2016-2019', 'impermeabilizacion', 'Impermeabilización interior con poliurea y protección anticarbonatación exterior de acueductos: unos 5.000 m².', 'Impermeabilización interior con poliurea y tratamiento anticarbonatación exterior de acueductos del transvase Tajo-Segura, con unos 5.000 m² impermeabilizados.
- Hidrolimpieza a alta presión por dentro y por fuera.
- Medias cañas con mortero y tratamiento de juntas con bandas impermeables adheridas con mortero epoxi.
- Membrana de poliurea proyectada en caliente en toda la superficie interior.
- Revestimiento anticarbonatación en toda la superficie exterior.', true, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Transvase Tajo-Segura, Cuenca', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/transvase-tajo-segura/01.jpg', 1000, 600, 1),
  ('obras/transvase-tajo-segura/02.jpg', 1000, 600, 2),
  ('obras/transvase-tajo-segura/03.jpg', 1000, 600, 3),
  ('obras/transvase-tajo-segura/04.jpg', 1000, 600, 4),
  ('obras/transvase-tajo-segura/05.jpg', 1000, 600, 5),
  ('obras/transvase-tajo-segura/06.jpg', 1000, 600, 6),
  ('obras/transvase-tajo-segura/07.jpg', 1000, 600, 7),
  ('obras/transvase-tajo-segura/08.jpg', 1000, 600, 8),
  ('obras/transvase-tajo-segura/09.jpg', 1000, 600, 9),
  ('obras/transvase-tajo-segura/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'transvase-tajo-segura'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('presa-horcajo', 'Presa Horcajo', 'Hervás (Cáceres)', '2017', 'reparacion_refuerzo', 'Reparación, tratamiento de juntas e impermeabilización con mortero de la zona de aguas abajo: unos 2.000 m².', 'Reparación, protección e impermeabilización de la presa de Horcajo en la zona de aguas abajo, en unos 2.000 m².
- Hidrolimpieza a alta presión, hasta 600 atm.
- Repicado del hormigón suelto o en mal estado.
- Lijado mecánico y pasivado de las armaduras expuestas.
- Reconstrucción de la geometría original con mortero de reparación estructural de clase R4.
- Tratamiento de juntas con bandas de PEAD ancladas mecánicamente al soporte.
- Mortero impermeable bicomponente en toda la superficie.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Presa Horcajo, Hervás (Cáceres)', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/presa-horcajo/01.jpg', 1000, 600, 1),
  ('obras/presa-horcajo/02.jpg', 1000, 600, 2),
  ('obras/presa-horcajo/03.jpg', 1000, 600, 3),
  ('obras/presa-horcajo/04.jpg', 1000, 600, 4),
  ('obras/presa-horcajo/05.jpg', 1000, 600, 5),
  ('obras/presa-horcajo/06.jpg', 1000, 600, 6),
  ('obras/presa-horcajo/07.jpg', 1000, 600, 7),
  ('obras/presa-horcajo/08.jpg', 1000, 600, 8),
  ('obras/presa-horcajo/09.jpg', 1000, 600, 9),
  ('obras/presa-horcajo/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'presa-horcajo'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('balsa-la-caldereta-la-palma', 'Balsa La Caldereta', 'La Palma', '2017', 'impermeabilizacion', 'Impermeabilización de una balsa de riego de unos 25.000 m² con lámina de PVC.', 'Impermeabilización de una balsa de riego de unos 25.000 m² con lámina de PVC de formulación especial («formulación barlovento»).
- Retirada de los elementos de lastrado de toda la balsa.
- Fieltro geotextil de alto gramaje.
- Geodrén con geotextil incorporado, antes de la impermeabilización.
- Lámina de PVC de 1,5 mm de formulación especial, termosoldada con máquina automática.
- Recolocación de los elementos de lastrado.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Balsa La Caldereta, La Palma', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/balsa-la-caldereta-la-palma/01.jpg', 1600, 1200, 1),
  ('obras/balsa-la-caldereta-la-palma/02.jpg', 1600, 1200, 2),
  ('obras/balsa-la-caldereta-la-palma/03.jpg', 1600, 1200, 3),
  ('obras/balsa-la-caldereta-la-palma/04.jpg', 1600, 1200, 4),
  ('obras/balsa-la-caldereta-la-palma/05.jpg', 1000, 600, 5),
  ('obras/balsa-la-caldereta-la-palma/06.jpg', 1000, 600, 6),
  ('obras/balsa-la-caldereta-la-palma/07.jpg', 1000, 600, 7),
  ('obras/balsa-la-caldereta-la-palma/08.jpg', 1000, 600, 8)
) as f(ruta, ancho, alto, orden)
where o.slug = 'balsa-la-caldereta-la-palma'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('mercadona-asura', 'Mercadona Asura', 'Madrid', '2016', 'reparacion_refuerzo', 'Refuerzo integral de varios forjados con mortero de alta resistencia y unos 6.000 m² de tejido de fibra de carbono.', 'Refuerzo estructural integral de varios forjados con mortero de alta resistencia y tejido de fibra de carbono, con unos 6.000 m² de tejido instalado.
- Anclajes con resina epoxi para el refuerzo a punzonamiento y recrecido de ábacos con mortero de altas prestaciones.
- Repicado y regularización del hormigón con mortero de reparación R4 y mortero epoxi antes de instalar el refuerzo.
- Tejido de fibra de carbono en varias capas en vigas, viguetas y ábacos, por la cara superior e inferior de los forjados de todas las plantas.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Mercadona Asura, Madrid', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/mercadona-asura/01.jpg', 1000, 600, 1),
  ('obras/mercadona-asura/02.jpg', 1000, 600, 2),
  ('obras/mercadona-asura/03.jpg', 1000, 600, 3),
  ('obras/mercadona-asura/04.jpg', 1000, 600, 4),
  ('obras/mercadona-asura/05.jpg', 1000, 600, 5),
  ('obras/mercadona-asura/06.jpg', 1000, 600, 6),
  ('obras/mercadona-asura/07.jpg', 1000, 600, 7),
  ('obras/mercadona-asura/08.jpg', 1000, 600, 8),
  ('obras/mercadona-asura/09.jpg', 1000, 600, 9),
  ('obras/mercadona-asura/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'mercadona-asura'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('viaducto-casatejada', 'Viaducto Casatejada', 'Cáceres', '2016', 'impermeabilizacion', 'Impermeabilización de un tablero de unos 15.000 m² con lámina asfáltica para tráfico rodado.', 'Impermeabilización del viaducto de Casatejada, de unos 15.000 m², con lámina asfáltica especial para tráfico rodado.
- Chorreado de la superficie con agua a 300 atm.
- Imprimación asfáltica.
- Lámina asfáltica autoprotegida para tráfico rodado, apta para verter el aglomerado encima.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Viaducto Casatejada, Cáceres', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/viaducto-casatejada/01.jpg', 1000, 600, 1),
  ('obras/viaducto-casatejada/02.jpg', 1000, 600, 2),
  ('obras/viaducto-casatejada/03.jpg', 1000, 600, 3),
  ('obras/viaducto-casatejada/04.jpg', 1000, 600, 4)
) as f(ruta, ancho, alto, orden)
where o.slug = 'viaducto-casatejada'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('jardines-de-la-sierra-cordoba', 'Edificio Jardines de la Sierra', 'Córdoba', '2015', 'reparacion_refuerzo', 'Reparación y refuerzo de una estructura de hormigón tras un incendio, con unos 5.000 m² de tejido de fibra de carbono.', 'Reparación y refuerzo de la estructura de hormigón tras un incendio, con unos 5.000 m² de tejido de fibra de carbono instalado en varias capas.
- Repicado de las partes sueltas y chorreado con arena de toda la estructura para eliminar el hollín.
- Reparación de los elementos de hormigón con mortero de reparación estructural R4.
- Tejido de fibra de carbono en varias capas en viguetas, vigas y pilares.', false, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Edificio Jardines de la Sierra, Córdoba', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/jardines-de-la-sierra-cordoba/01.jpg', 1000, 600, 1),
  ('obras/jardines-de-la-sierra-cordoba/02.jpg', 1000, 600, 2),
  ('obras/jardines-de-la-sierra-cordoba/03.jpg', 1000, 600, 3),
  ('obras/jardines-de-la-sierra-cordoba/04.jpg', 1000, 600, 4),
  ('obras/jardines-de-la-sierra-cordoba/05.jpg', 1000, 600, 5),
  ('obras/jardines-de-la-sierra-cordoba/06.jpg', 1000, 600, 6),
  ('obras/jardines-de-la-sierra-cordoba/07.jpg', 1000, 600, 7),
  ('obras/jardines-de-la-sierra-cordoba/08.jpg', 1000, 600, 8),
  ('obras/jardines-de-la-sierra-cordoba/09.jpg', 1000, 600, 9),
  ('obras/jardines-de-la-sierra-cordoba/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'jardines-de-la-sierra-cordoba'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('central-nuclear-almaraz', 'Central Nuclear de Almaraz', 'Cáceres', '2011-2012', 'impermeabilizacion', 'Impermeabilización con poliurea proyectada en caliente de las cubiertas de los edificios eléctricos y la sala de control: unos 5.000 m².', 'Impermeabilización con membrana de poliurea de las cubiertas de los edificios eléctricos y de la sala de control, con unos 5.000 m² en total.
- Retirada de la losa filtrante y de los restos del tratamiento original.
- Reconstrucción de los elementos deteriorados con mortero de reparación, medias cañas y sellados.
- Nueva capa de aislamiento sobre la cubierta original (panel PIR o espuma de poliuretano, según la cubierta).
- Lámina asfáltica previa a la poliurea.
- Imprimación epoxi apta para soportes metálicos, asfálticos y de hormigón.
- Membrana de poliurea proyectada en caliente con equipo de proyección especial.
- Revestimiento de poliuretano alifático para proteger la poliurea de la radiación UV.
- Nueva losa filtrante en toda la superficie.', true, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Central Nuclear de Almaraz, Cáceres', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/central-nuclear-almaraz/01.jpg', 1000, 600, 1),
  ('obras/central-nuclear-almaraz/02.jpg', 1000, 600, 2),
  ('obras/central-nuclear-almaraz/03.jpg', 1000, 600, 3),
  ('obras/central-nuclear-almaraz/04.jpg', 1000, 600, 4),
  ('obras/central-nuclear-almaraz/05.jpg', 1000, 600, 5),
  ('obras/central-nuclear-almaraz/06.jpg', 1000, 600, 6),
  ('obras/central-nuclear-almaraz/07.jpg', 1000, 600, 7),
  ('obras/central-nuclear-almaraz/08.jpg', 1000, 600, 8),
  ('obras/central-nuclear-almaraz/09.jpg', 1000, 600, 9),
  ('obras/central-nuclear-almaraz/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'central-nuclear-almaraz'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('aeropuerto-sevilla', 'Aeropuerto de Sevilla', 'Sevilla', '2011', 'impermeabilizacion', 'Impermeabilización de cubiertas planas e inclinadas, unos 25.000 m², con poliurea proyectada en caliente.', 'Impermeabilización con membrana de poliurea de las cubiertas planas e inclinadas del aeropuerto de Sevilla, en unos 25.000 m².
- Hidrolimpieza a alta presión, hasta 300 atm, para eliminar los restos de los tratamientos originales.
- Sellado de encuentros, medias cañas con mortero y tratamiento de las juntas de dilatación estructurales.
- Imprimación epoxi apta para soportes de hormigón y vitrificados.
- Membrana de poliurea proyectada en caliente en cubiertas planas e inclinadas de teja.
- Revestimiento de poliuretano alifático para proteger la poliurea de la radiación UV.
- Losa filtrante en las zonas de mantenimiento.', true, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Aeropuerto de Sevilla, Sevilla', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/aeropuerto-sevilla/01.jpg', 1000, 600, 1),
  ('obras/aeropuerto-sevilla/02.jpg', 1000, 600, 2),
  ('obras/aeropuerto-sevilla/03.jpg', 1000, 600, 3),
  ('obras/aeropuerto-sevilla/04.jpg', 1000, 600, 4),
  ('obras/aeropuerto-sevilla/05.jpg', 1000, 600, 5),
  ('obras/aeropuerto-sevilla/06.jpg', 1000, 600, 6),
  ('obras/aeropuerto-sevilla/07.jpg', 1000, 600, 7),
  ('obras/aeropuerto-sevilla/08.jpg', 1000, 600, 8),
  ('obras/aeropuerto-sevilla/09.jpg', 1000, 600, 9),
  ('obras/aeropuerto-sevilla/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'aeropuerto-sevilla'
on conflict (storage_path) do nothing;

insert into public.web_obras (slug, titulo, ubicacion, anio, servicio, resumen, descripcion, destacada, publicada)
values ('aeropuerto-bilbao', 'Aeropuerto de Bilbao', 'Bilbao', '2010', 'impermeabilizacion', 'Impermeabilización de una cubierta de chapa de unos 10.000 m² con poliurea proyectada en caliente.', 'Impermeabilización con membrana de poliurea de la cubierta de chapa del aeropuerto de Bilbao, en unos 10.000 m².
- Hidrolimpieza a alta presión, hasta 300 atm, para eliminar los restos de los tratamientos originales.
- Sellado de los encuentros de chapas y tratamiento de las juntas de dilatación estructurales.
- Imprimación epoxi apta para soportes metálicos.
- Membrana de poliurea proyectada en caliente con equipo de proyección especial.
- Revestimiento de poliuretano alifático para proteger la poliurea de la radiación UV.', true, true)
on conflict (slug) do nothing;
insert into public.web_fotos (obra_id, storage_path, alt, ancho, alto, orden)
select o.id, f.ruta, 'Aeropuerto de Bilbao, Bilbao', f.ancho, f.alto, f.orden
from public.web_obras o, (values
  ('obras/aeropuerto-bilbao/01.jpg', 1000, 600, 1),
  ('obras/aeropuerto-bilbao/02.jpg', 1000, 600, 2),
  ('obras/aeropuerto-bilbao/03.jpg', 1000, 600, 3),
  ('obras/aeropuerto-bilbao/04.jpg', 1000, 600, 4),
  ('obras/aeropuerto-bilbao/05.jpg', 1000, 600, 5),
  ('obras/aeropuerto-bilbao/06.jpg', 1000, 600, 6),
  ('obras/aeropuerto-bilbao/07.jpg', 1000, 600, 7),
  ('obras/aeropuerto-bilbao/08.jpg', 1000, 600, 8),
  ('obras/aeropuerto-bilbao/09.jpg', 1000, 600, 9),
  ('obras/aeropuerto-bilbao/10.jpg', 1000, 600, 10)
) as f(ruta, ancho, alto, orden)
where o.slug = 'aeropuerto-bilbao'
on conflict (storage_path) do nothing;
