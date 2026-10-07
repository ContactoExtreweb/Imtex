-- Totales a origen de cada obra, para el listado y la portada (una fila por obra, sumada en SQL).
-- Costes = todos los apuntes + la estructura de cada mes (el % de gastos generales sobre lo certificado
-- en el mes, a 2 decimales), igual que calcularObra en crm/src/lib/calculos/control-obra.ts.

create view public.control_obra_origen with (security_invoker = true) as
select o.id as obra_id,
  coalesce(sum(m.certificacion), 0) as certificado,
  coalesce(sum(m.personal + m.subcontrata + m.materiales + m.alquileres + m.combustible + m.dietas + m.hoteles
    + round(m.certificacion * o.gastos_generales_pct / 100, 2)), 0) as costes
from public.obras o
left join public.control_obra_mensual m on m.obra_id = o.id
group by o.id;
