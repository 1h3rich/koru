-- Edad de la cuidadora/educadora responsable de la cuenta. Nullable a
-- nivel de BD para no romper cuentas ya creadas antes de este cambio;
-- desde el registro (src/app/registro) pasa a ser obligatoria junto
-- con nombre_educador, validado en la propia Server Action.
alter table public.cuentas
  add column edad integer check (edad is null or edad between 16 and 100);
