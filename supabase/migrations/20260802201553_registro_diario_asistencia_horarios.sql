-- Modulo 6: registro diario por nino, asistencia (entrada/salida) y
-- horario semanal de actividades por aula.

-- ============================================================
-- registros_diarios: un resumen por nino y dia (comida, siesta,
-- panal/bano, estado de animo, actividad del dia, foto). Una fila
-- por nino y fecha: se actualiza (upsert), no se acumulan varias
-- filas el mismo dia.
-- ============================================================
create table public.registros_diarios (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  fecha date not null default current_date,
  comida text check (comida in ('bien', 'regular', 'nada')),
  siesta text check (siesta in ('bien', 'poco', 'nada')),
  panal_bano text,
  estado_animo text check (estado_animo in ('contento', 'tranquilo', 'inquieto', 'triste')),
  actividad text,
  foto_url text,
  creado_por uuid not null references public.cuentas (id),
  created_at timestamptz not null default now(),
  unique (nino_id, fecha)
);

alter table public.registros_diarios enable row level security;

create policy "registros_diarios_select_cuenta_propietaria"
  on public.registros_diarios for select
  using (
    exists (
      select 1 from public.ninos n
      where n.id = registros_diarios.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "registros_diarios_insert_cuenta_propietaria"
  on public.registros_diarios for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = registros_diarios.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "registros_diarios_update_cuenta_propietaria"
  on public.registros_diarios for update
  using (
    exists (
      select 1 from public.ninos n
      where n.id = registros_diarios.nino_id and n.cuenta_id = auth.uid()
    )
  );

-- El padre solo lee los registros de ninos que tiene vinculados.
create policy "registros_diarios_select_padre_vinculado"
  on public.registros_diarios for select
  using (
    exists (
      select 1 from public.nino_padre np
      where np.nino_id = registros_diarios.nino_id and np.padre_id = auth.uid()
    )
  );

-- ============================================================
-- asistencia: hora de entrada/salida y quien entrega/recoge cada
-- dia. "quien_entrega"/"quien_recoge" son texto libre (no FK a
-- nino_padre): puede recoger alguien sin cuenta en la app (abuelos,
-- otros familiares), y sirve como registro ante situaciones de
-- padres separados u otras complicaciones de custodia.
-- ============================================================
create table public.asistencia (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  fecha date not null default current_date,
  hora_entrada time,
  quien_entrega text,
  hora_salida time,
  quien_recoge text,
  creado_por uuid not null references public.cuentas (id),
  created_at timestamptz not null default now(),
  unique (nino_id, fecha)
);

alter table public.asistencia enable row level security;

create policy "asistencia_select_cuenta_propietaria"
  on public.asistencia for select
  using (
    exists (
      select 1 from public.ninos n
      where n.id = asistencia.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "asistencia_insert_cuenta_propietaria"
  on public.asistencia for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = asistencia.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "asistencia_update_cuenta_propietaria"
  on public.asistencia for update
  using (
    exists (
      select 1 from public.ninos n
      where n.id = asistencia.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "asistencia_select_padre_vinculado"
  on public.asistencia for select
  using (
    exists (
      select 1 from public.nino_padre np
      where np.nino_id = asistencia.nino_id and np.padre_id = auth.uid()
    )
  );

-- ============================================================
-- horarios_semanales: horario fijo de actividades por aula (o para
-- toda la cuenta si es una cuidadora individual sin varias aulas).
-- Se configura una vez y se muestra igual a los padres cada semana,
-- sin tocarlo dia a dia (eso es "actividad" en registros_diarios).
-- ============================================================
create table public.horarios_semanales (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  aula text,
  dia_semana text not null check (
    dia_semana in ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo')
  ),
  hora time not null,
  actividad text not null,
  created_at timestamptz not null default now()
);

alter table public.horarios_semanales enable row level security;

create policy "horarios_semanales_select_cuenta_propietaria"
  on public.horarios_semanales for select
  using (cuenta_id = auth.uid());

create policy "horarios_semanales_insert_cuenta_propietaria"
  on public.horarios_semanales for insert
  with check (cuenta_id = auth.uid());

create policy "horarios_semanales_update_cuenta_propietaria"
  on public.horarios_semanales for update
  using (cuenta_id = auth.uid());

create policy "horarios_semanales_delete_cuenta_propietaria"
  on public.horarios_semanales for delete
  using (cuenta_id = auth.uid());

-- El padre ve el horario de la(s) aula(s) de sus propios ninos.
create policy "horarios_semanales_select_padre_vinculado"
  on public.horarios_semanales for select
  using (
    exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid()
        and n.cuenta_id = horarios_semanales.cuenta_id
        and (n.aula = horarios_semanales.aula or (n.aula is null and horarios_semanales.aula is null))
    )
  );
