-- Chat grupal por aula, ademas del chat privado 1:1 (nino) que ya
-- existe en "mensajes". Igual que horarios_semanales/avisos, se
-- escopa por (cuenta_id, aula) porque "aula" es texto libre, no
-- unico entre cuentas distintas.
create table public.mensajes_aula (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  aula text not null,
  autor_id uuid not null references auth.users (id) on delete cascade,
  contenido text not null,
  created_at timestamptz not null default now()
);

create index mensajes_aula_cuenta_aula_fecha_idx on public.mensajes_aula (cuenta_id, aula, created_at);

alter table public.mensajes_aula enable row level security;

create policy "mensajes_aula_select_cuenta_propietaria"
  on public.mensajes_aula for select
  using (cuenta_id = auth.uid());

create policy "mensajes_aula_insert_cuenta_propietaria"
  on public.mensajes_aula for insert
  with check (autor_id = auth.uid() and cuenta_id = auth.uid());

-- El padre ve y escribe en el chat del aula de sus propios ninos.
create policy "mensajes_aula_select_padre_vinculado"
  on public.mensajes_aula for select
  using (
    exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid()
        and n.cuenta_id = mensajes_aula.cuenta_id
        and n.aula = mensajes_aula.aula
    )
  );

create policy "mensajes_aula_insert_padre_vinculado"
  on public.mensajes_aula for insert
  with check (
    autor_id = auth.uid()
    and exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid()
        and n.cuenta_id = mensajes_aula.cuenta_id
        and n.aula = mensajes_aula.aula
    )
  );

alter publication supabase_realtime add table public.mensajes_aula;
