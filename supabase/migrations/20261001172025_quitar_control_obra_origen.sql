-- El listado y la portada calculan ahora los totales a origen con calcularObra (la misma función
-- que la ficha) sobre control_obra_mensual, así que esta vista ya no se usa.
-- Además redondeaba la estructura en SQL y podía diferir 1 céntimo de la ficha, que redondea
-- como la herramienta de IMTEX.

drop view public.control_obra_origen;
