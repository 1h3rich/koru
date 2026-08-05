-- Modulo 13: linea temporal real del dia (llegada 08:03, desayuno
-- 08:30, juegos 09:10...), ADEMAS del resumen diario de siempre
-- (registros_diarios), no en su lugar. El resumen sigue siendo el
-- flujo por defecto pensado para rellenarse en <1 minuto; los hitos
-- son opcionales, para quien quiera anotar momentos sueltos con
-- hora exacta a lo largo del dia.

create table public.hitos_dia (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  fecha date not null default current_date,
  hora time not null,
  descripcion text not null,
  creado_por uuid not null references public.cuentas (id),
  created_at timestamptz not null default now()
);

create index hitos_dia_nino_fecha_idx on public.hitos_dia (nino_id, fecha, hora);

alter table public.hitos_dia enable row level security;

create policy "hitos_dia_select_cuenta_propietaria"
  on public.hitos_dia for select
  using (
    exists (
      select 1 from public.ninos n
      where n.id = hitos_dia.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "hitos_dia_insert_cuenta_propietaria"
  on public.hitos_dia for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = hitos_dia.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "hitos_dia_delete_cuenta_propietaria"
  on public.hitos_dia for delete
  using (
    exists (
      select 1 from public.ninos n
      where n.id = hitos_dia.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "hitos_dia_select_padre_vinculado"
  on public.hitos_dia for select
  using (
    exists (
      select 1 from public.nino_padre np
      where np.nino_id = hitos_dia.nino_id and np.padre_id = auth.uid()
    )
  );
