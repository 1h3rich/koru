-- Personal: la app sigue siendo 1 cuenta = 1 login (sin roles, ver
-- comentario en 20260802184133), así que esto es una lista que
-- gestiona la cuenta -- igual que objetos_personales -- no un
-- sistema de usuarios/empleados con su propio acceso.
create table public.empleados (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  nombre text not null,
  turno text,
  created_at timestamptz not null default now()
);

alter table public.empleados enable row level security;

create policy "empleados_select_cuenta_propietaria"
  on public.empleados for select
  using (cuenta_id = auth.uid());

create policy "empleados_insert_cuenta_propietaria"
  on public.empleados for insert
  with check (cuenta_id = auth.uid());

create policy "empleados_update_cuenta_propietaria"
  on public.empleados for update
  using (cuenta_id = auth.uid());

create policy "empleados_delete_cuenta_propietaria"
  on public.empleados for delete
  using (cuenta_id = auth.uid());

create table public.ausencias_personal (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  tipo text not null check (tipo in ('vacaciones', 'sustitucion', 'baja', 'otro')),
  fecha_inicio date not null,
  fecha_fin date not null,
  sustituto text,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.ausencias_personal enable row level security;

create policy "ausencias_personal_select_cuenta_propietaria"
  on public.ausencias_personal for select
  using (exists (select 1 from public.empleados e where e.id = ausencias_personal.empleado_id and e.cuenta_id = auth.uid()));

create policy "ausencias_personal_insert_cuenta_propietaria"
  on public.ausencias_personal for insert
  with check (exists (select 1 from public.empleados e where e.id = ausencias_personal.empleado_id and e.cuenta_id = auth.uid()));

create policy "ausencias_personal_delete_cuenta_propietaria"
  on public.ausencias_personal for delete
  using (exists (select 1 from public.empleados e where e.id = ausencias_personal.empleado_id and e.cuenta_id = auth.uid()));
