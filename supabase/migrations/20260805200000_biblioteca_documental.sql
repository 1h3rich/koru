-- Biblioteca documental: documentos generales de la cuenta (no de un
-- niño en concreto) — normas, circulares, autorizaciones tipo, menú
-- semanal en PDF si la cuidadora prefiere colgarlo así en vez del
-- menú estructurado. Sube la cuidadora, ven todos los padres
-- vinculados a algún niño de esa cuenta (no solo a uno).
create table public.documentos_cuenta (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  categoria text not null check (categoria in ('autorizacion', 'menu', 'normas', 'circular', 'otro')),
  nombre text not null,
  ruta text not null,
  created_at timestamptz not null default now()
);

alter table public.documentos_cuenta enable row level security;

create policy "documentos_cuenta_select_cuenta_propietaria"
  on public.documentos_cuenta for select
  using (cuenta_id = auth.uid());

create policy "documentos_cuenta_insert_cuenta_propietaria"
  on public.documentos_cuenta for insert
  with check (cuenta_id = auth.uid());

create policy "documentos_cuenta_delete_cuenta_propietaria"
  on public.documentos_cuenta for delete
  using (cuenta_id = auth.uid());

create policy "documentos_cuenta_select_padre_vinculado"
  on public.documentos_cuenta for select
  using (
    exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid() and n.cuenta_id = documentos_cuenta.cuenta_id
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-cuenta', 'documentos-cuenta', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Ruta de cada fichero: "{cuenta_id}/{nombre_unico}" — el primer
-- segmento identifica la cuenta, igual que en documentos-ninos.
create policy "cuidadora_sube_documentos_cuenta"
  on storage.objects for insert
  with check (bucket_id = 'documentos-cuenta' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cuidadora_ve_documentos_cuenta"
  on storage.objects for select
  using (bucket_id = 'documentos-cuenta' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "padre_ve_documentos_cuenta"
  on storage.objects for select
  using (
    bucket_id = 'documentos-cuenta'
    and exists (
      select 1
      from public.nino_padre np
      join public.ninos n on n.id = np.nino_id
      where np.padre_id = auth.uid() and n.cuenta_id::text = (storage.foldername(name))[1]
    )
  );
