-- Hitos de desarrollo estandarizados (catálogo fijo en código, ver
-- src/lib/hitosDesarrollo.js) y evaluaciones periódicas más
-- formales, además de las observaciones libres que ya había. Mismas
-- RLS que observaciones_desarrollo.
create table public.hitos_desarrollo_nino (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  area text not null check (area in ('motricidad', 'lenguaje', 'socializacion', 'creatividad', 'autonomia')),
  hito text not null,
  fecha_alcanzado date not null default current_date,
  creado_por uuid not null references public.cuentas (id),
  created_at timestamptz not null default now(),
  unique (nino_id, area, hito)
);

alter table public.hitos_desarrollo_nino enable row level security;

create policy "hitos_desarrollo_nino_select_cuenta_propietaria"
  on public.hitos_desarrollo_nino for select
  using (exists (select 1 from public.ninos n where n.id = hitos_desarrollo_nino.nino_id and n.cuenta_id = auth.uid()));

create policy "hitos_desarrollo_nino_insert_cuenta_propietaria"
  on public.hitos_desarrollo_nino for insert
  with check (exists (select 1 from public.ninos n where n.id = hitos_desarrollo_nino.nino_id and n.cuenta_id = auth.uid()));

create policy "hitos_desarrollo_nino_delete_cuenta_propietaria"
  on public.hitos_desarrollo_nino for delete
  using (exists (select 1 from public.ninos n where n.id = hitos_desarrollo_nino.nino_id and n.cuenta_id = auth.uid()));

create policy "hitos_desarrollo_nino_select_padre_vinculado"
  on public.hitos_desarrollo_nino for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = hitos_desarrollo_nino.nino_id and np.padre_id = auth.uid()));

create table public.evaluaciones_desarrollo (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  area text not null check (area in ('motricidad', 'lenguaje', 'socializacion', 'creatividad', 'autonomia')),
  fecha date not null default current_date,
  nivel text not null check (nivel in ('inicial', 'en_proceso', 'logrado')),
  notas text,
  creado_por uuid not null references public.cuentas (id),
  created_at timestamptz not null default now()
);

alter table public.evaluaciones_desarrollo enable row level security;

create policy "evaluaciones_desarrollo_select_cuenta_propietaria"
  on public.evaluaciones_desarrollo for select
  using (exists (select 1 from public.ninos n where n.id = evaluaciones_desarrollo.nino_id and n.cuenta_id = auth.uid()));

create policy "evaluaciones_desarrollo_insert_cuenta_propietaria"
  on public.evaluaciones_desarrollo for insert
  with check (exists (select 1 from public.ninos n where n.id = evaluaciones_desarrollo.nino_id and n.cuenta_id = auth.uid()));

create policy "evaluaciones_desarrollo_delete_cuenta_propietaria"
  on public.evaluaciones_desarrollo for delete
  using (exists (select 1 from public.ninos n where n.id = evaluaciones_desarrollo.nino_id and n.cuenta_id = auth.uid()));

create policy "evaluaciones_desarrollo_select_padre_vinculado"
  on public.evaluaciones_desarrollo for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = evaluaciones_desarrollo.nino_id and np.padre_id = auth.uid()));
