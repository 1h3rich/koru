-- Fecha de nacimiento (opcional): pedida por el usuario para poder
-- mostrar la edad del nino en anos/meses. Nullable a proposito para
-- no romper altas existentes ni obligar a dar este dato si alguna
-- cuidadora prefiere no guardarlo.
alter table public.ninos add column fecha_nacimiento date;
