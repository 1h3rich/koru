-- Facturación como registro de ESTADOS, nunca pagos reales: la
-- cuidadora anota qué se debe y si está pagado, no hay pasarela de
-- pago ni se guardan datos financieros (ver /acerca-de).
create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  concepto text not null check (concepto in ('mensualidad', 'comedor', 'horas_extra', 'material', 'otro')),
  descripcion text,
  periodo text not null,
  importe numeric(8,2),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  creado_por uuid not null references public.cuentas (id),
  created_at timestamptz not null default now()
);

create index cuotas_nino_periodo_idx on public.cuotas (nino_id, periodo);

alter table public.cuotas enable row level security;

create policy "cuotas_select_cuenta_propietaria"
  on public.cuotas for select
  using (exists (select 1 from public.ninos n where n.id = cuotas.nino_id and n.cuenta_id = auth.uid()));

create policy "cuotas_insert_cuenta_propietaria"
  on public.cuotas for insert
  with check (exists (select 1 from public.ninos n where n.id = cuotas.nino_id and n.cuenta_id = auth.uid()));

create policy "cuotas_update_cuenta_propietaria"
  on public.cuotas for update
  using (exists (select 1 from public.ninos n where n.id = cuotas.nino_id and n.cuenta_id = auth.uid()));

create policy "cuotas_delete_cuenta_propietaria"
  on public.cuotas for delete
  using (exists (select 1 from public.ninos n where n.id = cuotas.nino_id and n.cuenta_id = auth.uid()));

create policy "cuotas_select_padre_vinculado"
  on public.cuotas for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = cuotas.nino_id and np.padre_id = auth.uid()));
