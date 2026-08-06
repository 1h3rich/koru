-- Menú semanal estructurado (no solo un PDF colgado), con alérgenos
-- por plato. Mismo patrón de scoping por aula que horarios_semanales.
create table public.menu_semanal (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  aula text,
  dia_semana text not null check (
    dia_semana in ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo')
  ),
  comida text not null check (comida in ('desayuno', 'almuerzo', 'merienda')),
  plato text not null,
  alergenos text,
  created_at timestamptz not null default now()
);

alter table public.menu_semanal enable row level security;

create policy "menu_semanal_select_cuenta_propietaria"
  on public.menu_semanal for select
  using (cuenta_id = auth.uid());

create policy "menu_semanal_insert_cuenta_propietaria"
  on public.menu_semanal for insert
  with check (cuenta_id = auth.uid());

create policy "menu_semanal_delete_cuenta_propietaria"
  on public.menu_semanal for delete
  using (cuenta_id = auth.uid());

create policy "menu_semanal_select_padre_vinculado"
  on public.menu_semanal for select
  using (
    exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid()
        and n.cuenta_id = menu_semanal.cuenta_id
        and (n.aula = menu_semanal.aula or (n.aula is null and menu_semanal.aula is null))
    )
  );

-- Dietas especiales por niño (vegetariano, sin lactosa...), gestionada
-- por la familia igual que alergias — es información suya, no algo
-- que la cuidadora tenga que averiguar.
create table public.dietas_especiales (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  descripcion text not null,
  created_at timestamptz not null default now()
);

alter table public.dietas_especiales enable row level security;

create policy "dietas_especiales_select_cuenta_propietaria"
  on public.dietas_especiales for select
  using (exists (select 1 from public.ninos n where n.id = dietas_especiales.nino_id and n.cuenta_id = auth.uid()));

create policy "dietas_especiales_select_padre_vinculado"
  on public.dietas_especiales for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = dietas_especiales.nino_id and np.padre_id = auth.uid()));

create policy "dietas_especiales_insert_padre_vinculado"
  on public.dietas_especiales for insert
  with check (exists (select 1 from public.nino_padre np where np.nino_id = dietas_especiales.nino_id and np.padre_id = auth.uid()));

create policy "dietas_especiales_delete_padre_vinculado"
  on public.dietas_especiales for delete
  using (exists (select 1 from public.nino_padre np where np.nino_id = dietas_especiales.nino_id and np.padre_id = auth.uid()));
