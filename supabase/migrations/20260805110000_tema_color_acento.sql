-- Color de acento de la cuidadora/guarderia, para personalizar
-- botones y resaltados de toda la app sin tocar el resto de la
-- paleta. NOT NULL con default es seguro aqui: Postgres rellena las
-- filas existentes con 'morado' automaticamente al aplicar el ALTER.
alter table public.cuentas
  add column color_acento text not null default 'morado'
    check (color_acento in ('morado', 'azul', 'verde', 'naranja'));
