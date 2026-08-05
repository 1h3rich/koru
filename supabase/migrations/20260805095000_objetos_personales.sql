-- Modulo 15: checklist de objetos personales que cada nino debe
-- traer (panales, ropa de cambio, chupete...). Es una lista de
-- recordatorio fija, no un registro diario -- la cuidadora la
-- mantiene una vez y los padres la ven como recordatorio, no algo
-- que haya que marcar cada dia (evita carga diaria extra).

create table public.objetos_personales (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  objeto text not null,
  created_at timestamptz not null default now()
);

alter table public.objetos_personales enable row level security;

create policy "objetos_personales_select_cuenta_propietaria"
  on public.objetos_personales for select
  using (
    exists (
      select 1 from public.ninos n
      where n.id = objetos_personales.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "objetos_personales_insert_cuenta_propietaria"
  on public.objetos_personales for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = objetos_personales.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "objetos_personales_delete_cuenta_propietaria"
  on public.objetos_personales for delete
  using (
    exists (
      select 1 from public.ninos n
      where n.id = objetos_personales.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "objetos_personales_select_padre_vinculado"
  on public.objetos_personales for select
  using (
    exists (
      select 1 from public.nino_padre np
      where np.nino_id = objetos_personales.nino_id and np.padre_id = auth.uid()
    )
  );
