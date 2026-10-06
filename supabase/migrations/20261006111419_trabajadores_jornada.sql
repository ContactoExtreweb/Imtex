-- Jornada de contrato de cada trabajador, en horas al día. En los partes en papel, la casilla HORAS
-- vacía quiere decir «la jornada de su contrato»: lo que se escribe suele ser solo las EXTRAS
-- (lo explicó Saúl con el primer parte real, 06/10/2026).
alter table public.trabajadores
  add column jornada_horas numeric(4,2) not null default 8 check (jornada_horas > 0 and jornada_horas <= 12);
