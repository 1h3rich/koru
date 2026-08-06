-- Contactos alternativos de emergencia (abuela, vecino...), además
-- del teléfono directo de cada padre/madre que ya existía en
-- nino_padre.telefono_emergencia. Gestionados por la familia.
create table public.contactos_emergencia (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  nombre text not null,
  telefono text not null,
  parentesco text,
  created_at timestamptz not null default now()
);

alter table public.contactos_emergencia enable row level security;

create policy "contactos_emergencia_select_cuenta_propietaria"
  on public.contactos_emergencia for select
  using (exists (select 1 from public.ninos n where n.id = contactos_emergencia.nino_id and n.cuenta_id = auth.uid()));

create policy "contactos_emergencia_select_padre_vinculado"
  on public.contactos_emergencia for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = contactos_emergencia.nino_id and np.padre_id = auth.uid()));

create policy "contactos_emergencia_insert_padre_vinculado"
  on public.contactos_emergencia for insert
  with check (exists (select 1 from public.nino_padre np where np.nino_id = contactos_emergencia.nino_id and np.padre_id = auth.uid()));

create policy "contactos_emergencia_delete_padre_vinculado"
  on public.contactos_emergencia for delete
  using (exists (select 1 from public.nino_padre np where np.nino_id = contactos_emergencia.nino_id and np.padre_id = auth.uid()));

-- Datos médicos básicos y opcionales (médico, hospital, seguro), una
-- fila por niño. Igual que alergias/dietas, los aporta la familia,
-- nunca un historial clínico completo.
create table public.info_medica_nino (
  nino_id uuid primary key references public.ninos (id) on delete cascade,
  medico text,
  hospital text,
  seguro text,
  created_at timestamptz not null default now()
);

alter table public.info_medica_nino enable row level security;

create policy "info_medica_nino_select_cuenta_propietaria"
  on public.info_medica_nino for select
  using (exists (select 1 from public.ninos n where n.id = info_medica_nino.nino_id and n.cuenta_id = auth.uid()));

create policy "info_medica_nino_select_padre_vinculado"
  on public.info_medica_nino for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = info_medica_nino.nino_id and np.padre_id = auth.uid()));

create policy "info_medica_nino_insert_padre_vinculado"
  on public.info_medica_nino for insert
  with check (exists (select 1 from public.nino_padre np where np.nino_id = info_medica_nino.nino_id and np.padre_id = auth.uid()));

create policy "info_medica_nino_update_padre_vinculado"
  on public.info_medica_nino for update
  using (exists (select 1 from public.nino_padre np where np.nino_id = info_medica_nino.nino_id and np.padre_id = auth.uid()));
