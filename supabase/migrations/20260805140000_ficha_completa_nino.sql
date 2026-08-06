-- Ficha completa del niño: alergias y personas autorizadas a
-- recoger las gestiona la familia (quien tiene esa información),
-- visibles para la cuidadora. Incidencias las registra la cuidadora,
-- visibles para la familia. Documentos (DNI, autorizaciones) los
-- puede subir cualquiera de los dos, visibles para ambos — a
-- diferencia de las fotos del diario, aquí no aplica la regla de "la
-- cuidadora no puede volver a verlo".

create table public.alergias (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  alergeno text not null,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.alergias enable row level security;

create policy "alergias_select_cuenta_propietaria"
  on public.alergias for select
  using (exists (select 1 from public.ninos n where n.id = alergias.nino_id and n.cuenta_id = auth.uid()));

create policy "alergias_select_padre_vinculado"
  on public.alergias for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = alergias.nino_id and np.padre_id = auth.uid()));

create policy "alergias_insert_padre_vinculado"
  on public.alergias for insert
  with check (exists (select 1 from public.nino_padre np where np.nino_id = alergias.nino_id and np.padre_id = auth.uid()));

create policy "alergias_delete_padre_vinculado"
  on public.alergias for delete
  using (exists (select 1 from public.nino_padre np where np.nino_id = alergias.nino_id and np.padre_id = auth.uid()));

create table public.personas_autorizadas (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  nombre text not null,
  dni text,
  telefono text,
  parentesco text,
  created_at timestamptz not null default now()
);

alter table public.personas_autorizadas enable row level security;

create policy "personas_autorizadas_select_cuenta_propietaria"
  on public.personas_autorizadas for select
  using (exists (select 1 from public.ninos n where n.id = personas_autorizadas.nino_id and n.cuenta_id = auth.uid()));

create policy "personas_autorizadas_select_padre_vinculado"
  on public.personas_autorizadas for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = personas_autorizadas.nino_id and np.padre_id = auth.uid()));

create policy "personas_autorizadas_insert_padre_vinculado"
  on public.personas_autorizadas for insert
  with check (exists (select 1 from public.nino_padre np where np.nino_id = personas_autorizadas.nino_id and np.padre_id = auth.uid()));

create policy "personas_autorizadas_delete_padre_vinculado"
  on public.personas_autorizadas for delete
  using (exists (select 1 from public.nino_padre np where np.nino_id = personas_autorizadas.nino_id and np.padre_id = auth.uid()));

create table public.incidencias (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  fecha date not null default current_date,
  descripcion text not null,
  created_at timestamptz not null default now()
);

alter table public.incidencias enable row level security;

create policy "incidencias_select_cuenta_propietaria"
  on public.incidencias for select
  using (exists (select 1 from public.ninos n where n.id = incidencias.nino_id and n.cuenta_id = auth.uid()));

create policy "incidencias_insert_cuenta_propietaria"
  on public.incidencias for insert
  with check (exists (select 1 from public.ninos n where n.id = incidencias.nino_id and n.cuenta_id = auth.uid()));

create policy "incidencias_delete_cuenta_propietaria"
  on public.incidencias for delete
  using (exists (select 1 from public.ninos n where n.id = incidencias.nino_id and n.cuenta_id = auth.uid()));

create policy "incidencias_select_padre_vinculado"
  on public.incidencias for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = incidencias.nino_id and np.padre_id = auth.uid()));

create table public.documentos_nino (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  nombre text not null,
  ruta text not null,
  autor_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.documentos_nino enable row level security;

create policy "documentos_nino_select_cuenta_propietaria"
  on public.documentos_nino for select
  using (exists (select 1 from public.ninos n where n.id = documentos_nino.nino_id and n.cuenta_id = auth.uid()));

create policy "documentos_nino_insert_cuenta_propietaria"
  on public.documentos_nino for insert
  with check (autor_id = auth.uid() and exists (select 1 from public.ninos n where n.id = documentos_nino.nino_id and n.cuenta_id = auth.uid()));

create policy "documentos_nino_delete_cuenta_propietaria"
  on public.documentos_nino for delete
  using (exists (select 1 from public.ninos n where n.id = documentos_nino.nino_id and n.cuenta_id = auth.uid()));

create policy "documentos_nino_select_padre_vinculado"
  on public.documentos_nino for select
  using (exists (select 1 from public.nino_padre np where np.nino_id = documentos_nino.nino_id and np.padre_id = auth.uid()));

create policy "documentos_nino_insert_padre_vinculado"
  on public.documentos_nino for insert
  with check (autor_id = auth.uid() and exists (select 1 from public.nino_padre np where np.nino_id = documentos_nino.nino_id and np.padre_id = auth.uid()));

create policy "documentos_nino_delete_padre_vinculado"
  on public.documentos_nino for delete
  using (exists (select 1 from public.nino_padre np where np.nino_id = documentos_nino.nino_id and np.padre_id = auth.uid()));

-- Bucket de documentos: a diferencia de fotos-ninos, aquí SÍ hay
-- politica de SELECT para la cuidadora (necesita verlos, no es un
-- dato de un solo sentido como las fotos). Admite PDF ademas de
-- imagenes porque DNIs/autorizaciones suelen escanearse asi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-ninos', 'documentos-ninos', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "cuidadora_sube_documentos"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-ninos'
    and exists (select 1 from public.ninos n where n.id::text = (storage.foldername(name))[1] and n.cuenta_id = auth.uid())
  );

create policy "cuidadora_ve_documentos"
  on storage.objects for select
  using (
    bucket_id = 'documentos-ninos'
    and exists (select 1 from public.ninos n where n.id::text = (storage.foldername(name))[1] and n.cuenta_id = auth.uid())
  );

create policy "padre_sube_documentos"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-ninos'
    and exists (select 1 from public.nino_padre np where np.nino_id::text = (storage.foldername(name))[1] and np.padre_id = auth.uid())
  );

create policy "padre_ve_documentos"
  on storage.objects for select
  using (
    bucket_id = 'documentos-ninos'
    and exists (select 1 from public.nino_padre np where np.nino_id::text = (storage.foldername(name))[1] and np.padre_id = auth.uid())
  );
