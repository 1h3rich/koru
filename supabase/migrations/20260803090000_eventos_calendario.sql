-- Modulo 7: calendario de eventos puntuales por fecha (excursiones,
-- festivos, cumpleanos...). Distinto de horarios_semanales (que es
-- recurrente por dia de la semana, sin fecha concreta): un evento
-- tiene una fecha real, para poder verlo con meses de antelacion.

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  aula text,
  fecha date not null,
  tipo text not null check (tipo in ('excursion', 'festivo', 'cumpleanos', 'otro')),
  titulo text not null,
  nota text,
  created_at timestamptz not null default now()
);

create index eventos_cuenta_fecha_idx on public.eventos (cuenta_id, fecha);

alter table public.eventos enable row level security;

create policy "eventos_select_cuenta_propietaria"
  on public.eventos for select
  using (cuenta_id = auth.uid());

create policy "eventos_insert_cuenta_propietaria"
  on public.eventos for insert
  with check (cuenta_id = auth.uid());

create policy "eventos_update_cuenta_propietaria"
  on public.eventos for update
  using (cuenta_id = auth.uid());

create policy "eventos_delete_cuenta_propietaria"
  on public.eventos for delete
  using (cuenta_id = auth.uid());

-- El padre ve los eventos del aula (o generales) de sus propios ninos.
create policy "eventos_select_padre_vinculado"
  on public.eventos for select
  using (
    exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid()
        and n.cuenta_id = eventos.cuenta_id
        and (n.aula = eventos.aula or eventos.aula is null)
    )
  );
