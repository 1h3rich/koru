-- Modulo 12: avisos de aula (unidireccionales, de la cuidadora a
-- todos los padres de un aula) + autorizaciones simples cuando el
-- aviso lo requiere (ej. excursion). Distinto del chat: esto no es
-- una conversacion, es un anuncio que puede necesitar confirmacion
-- explicita por nino (la autorizacion es del nino, no de la cuenta
-- del padre -- si un padre tiene dos hijos en la misma aula, cada
-- uno se confirma por separado).

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  aula text,
  titulo text not null,
  mensaje text not null,
  requiere_autorizacion boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.avisos enable row level security;

create policy "avisos_select_cuenta_propietaria"
  on public.avisos for select
  using (cuenta_id = auth.uid());

create policy "avisos_insert_cuenta_propietaria"
  on public.avisos for insert
  with check (cuenta_id = auth.uid());

create policy "avisos_delete_cuenta_propietaria"
  on public.avisos for delete
  using (cuenta_id = auth.uid());

-- El padre ve los avisos del aula (o generales) de sus propios ninos.
create policy "avisos_select_padre_vinculado"
  on public.avisos for select
  using (
    exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid()
        and n.cuenta_id = avisos.cuenta_id
        and (n.aula = avisos.aula or avisos.aula is null)
    )
  );

-- ============================================================
-- avisos_confirmaciones: quien ha confirmado que ha visto/autorizado
-- un aviso, por nino (no por padre: la autorizacion es del nino).
-- ============================================================
create table public.avisos_confirmaciones (
  aviso_id uuid not null references public.avisos (id) on delete cascade,
  nino_id uuid not null references public.ninos (id) on delete cascade,
  confirmado_por uuid not null references auth.users (id) on delete cascade,
  confirmado_en timestamptz not null default now(),
  primary key (aviso_id, nino_id)
);

alter table public.avisos_confirmaciones enable row level security;

-- El padre confirma/lee sus propias confirmaciones (de sus ninos).
create policy "avisos_confirmaciones_select_padre_propio"
  on public.avisos_confirmaciones for select
  using (
    exists (
      select 1 from public.nino_padre np
      where np.nino_id = avisos_confirmaciones.nino_id and np.padre_id = auth.uid()
    )
  );

create policy "avisos_confirmaciones_insert_padre_propio"
  on public.avisos_confirmaciones for insert
  with check (
    confirmado_por = auth.uid()
    and exists (
      select 1 from public.nino_padre np
      where np.nino_id = avisos_confirmaciones.nino_id and np.padre_id = auth.uid()
    )
  );

-- La cuidadora ve las confirmaciones de sus propios avisos, para
-- saber quien falta.
create policy "avisos_confirmaciones_select_cuenta_propietaria"
  on public.avisos_confirmaciones for select
  using (
    exists (
      select 1 from public.avisos a
      where a.id = avisos_confirmaciones.aviso_id and a.cuenta_id = auth.uid()
    )
  );
