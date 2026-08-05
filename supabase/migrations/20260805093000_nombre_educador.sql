-- Modulo 14: nombre de la educadora/cuidadora individual, ademas
-- del nombre del negocio -- para guarderias con varias educadoras,
-- el padre sabe quien es la persona responsable de su hijo, no solo
-- el nombre generico del centro. Opcional (una cuidadora individual
-- puede dejarlo vacio, ya se identifica con el nombre del negocio).

alter table public.cuentas
  add column nombre_educador text;
