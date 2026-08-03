-- Modulo 8: registro de accidentes/incidencias puntuales del dia
-- (un rasponazo, un golpe...). Es un evento del dia, no un historial
-- medico permanente -- por eso vive en registros_diarios (una fila
-- por nino y fecha) y no en una tabla de perfil de salud.

alter table public.registros_diarios
  add column accidente boolean not null default false,
  add column accidente_descripcion text;
