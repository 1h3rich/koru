-- Rutina diaria: actividades recurrentes iguales todos los días (ej.
-- "17:00 Siesta", "19:00 Juegos"), a diferencia de horarios_semanales
-- que varía por día de la semana. Mismo patrón de scoping por aula
-- (o toda la cuenta si aula es null) y las mismas RLS que
-- horarios_semanales/avisos.
create table public.rutina_diaria (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  aula text,
  hora time not null,
  actividad text not null,
  created_at timestamptz not null default now()
);

alter table public.rutina_diaria enable row level security;

create policy "rutina_diaria_select_cuenta_propietaria"
  on public.rutina_diaria for select
  using (cuenta_id = auth.uid());

create policy "rutina_diaria_insert_cuenta_propietaria"
  on public.rutina_diaria for insert
  with check (cuenta_id = auth.uid());

create policy "rutina_diaria_update_cuenta_propietaria"
  on public.rutina_diaria for update
  using (cuenta_id = auth.uid());

create policy "rutina_diaria_delete_cuenta_propietaria"
  on public.rutina_diaria for delete
  using (cuenta_id = auth.uid());

-- El padre ve la rutina de la(s) aula(s) de sus propios ninos.
create policy "rutina_diaria_select_padre_vinculado"
  on public.rutina_diaria for select
  using (
    exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid()
        and n.cuenta_id = rutina_diaria.cuenta_id
        and (n.aula = rutina_diaria.aula or (n.aula is null and rutina_diaria.aula is null))
    )
  );
