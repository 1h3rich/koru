-- Amplía registros_diarios: cantidad de comida (además de la
-- valoración cualitativa que ya había), pañal como checkbox
-- individual (solo se muestra en el resumen si se marcó, no un
-- campo de texto siempre visible), y temperatura como dato
-- puntual e individual (nunca se rellena en modo colectivo por aula).
alter table public.registros_diarios
  add column cantidad_comida text check (cantidad_comida in ('todo', 'mitad', 'poco', 'nada')),
  add column panal_cambiado boolean not null default false,
  add column temperatura numeric(3,1) check (temperatura is null or temperatura between 30 and 43);
