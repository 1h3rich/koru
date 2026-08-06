-- Adjuntos (foto o vídeo corto) en el chat privado. Igual que
-- documentos-ninos, no fotos-ninos: aquí la lectura es bidireccional
-- (ambos lados del chat lo ven siempre), no de un solo uso. El chat
-- grupal por aula queda fuera por ahora, igual que la confirmación
-- de lectura.
alter table public.mensajes
  add column adjunto_url text,
  add column adjunto_tipo text check (adjunto_tipo is null or adjunto_tipo in ('imagen', 'video'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adjuntos-mensajes', 'adjuntos-mensajes', false, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do nothing;

create policy "cuidadora_sube_adjuntos_mensajes"
  on storage.objects for insert
  with check (
    bucket_id = 'adjuntos-mensajes'
    and exists (select 1 from public.ninos n where n.id::text = (storage.foldername(name))[1] and n.cuenta_id = auth.uid())
  );

create policy "cuidadora_ve_adjuntos_mensajes"
  on storage.objects for select
  using (
    bucket_id = 'adjuntos-mensajes'
    and exists (select 1 from public.ninos n where n.id::text = (storage.foldername(name))[1] and n.cuenta_id = auth.uid())
  );

create policy "padre_sube_adjuntos_mensajes"
  on storage.objects for insert
  with check (
    bucket_id = 'adjuntos-mensajes'
    and exists (select 1 from public.nino_padre np where np.nino_id::text = (storage.foldername(name))[1] and np.padre_id = auth.uid())
  );

create policy "padre_ve_adjuntos_mensajes"
  on storage.objects for select
  using (
    bucket_id = 'adjuntos-mensajes'
    and exists (select 1 from public.nino_padre np where np.nino_id::text = (storage.foldername(name))[1] and np.padre_id = auth.uid())
  );
