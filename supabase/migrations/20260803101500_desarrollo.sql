-- Modulo 11: seguimiento de desarrollo. Observaciones cualitativas
-- fechadas por area, para ver la evolucion en el tiempo (ejemplo del
-- usuario: "primer dia, camina regular; final de curso, corre
-- genial"). No es un dato puntual del dia (por eso no vive en
-- registros_diarios) ni un historial medico -- es texto libre
-- observado por la cuidadora, fechado, agrupable por area.

create table public.observaciones_desarrollo (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  area text not null check (
    area in ('motricidad', 'lenguaje', 'socializacion', 'creatividad', 'autonomia')
  ),
  fecha date not null default current_date,
  texto text not null,
  creado_por uuid not null references public.cuentas (id),
  created_at timestamptz not null default now()
);

create index observaciones_desarrollo_nino_idx on public.observaciones_desarrollo (nino_id, area, fecha);

alter table public.observaciones_desarrollo enable row level security;

create policy "observaciones_desarrollo_select_cuenta_propietaria"
  on public.observaciones_desarrollo for select
  using (
    exists (
      select 1 from public.ninos n
      where n.id = observaciones_desarrollo.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "observaciones_desarrollo_insert_cuenta_propietaria"
  on public.observaciones_desarrollo for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = observaciones_desarrollo.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "observaciones_desarrollo_delete_cuenta_propietaria"
  on public.observaciones_desarrollo for delete
  using (
    exists (
      select 1 from public.ninos n
      where n.id = observaciones_desarrollo.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "observaciones_desarrollo_select_padre_vinculado"
  on public.observaciones_desarrollo for select
  using (
    exists (
      select 1 from public.nino_padre np
      where np.nino_id = observaciones_desarrollo.nino_id and np.padre_id = auth.uid()
    )
  );
