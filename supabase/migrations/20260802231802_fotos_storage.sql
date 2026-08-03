-- Fotos del registro diario. Bucket privado (nunca publico): el
-- acceso lo controla la RLS de storage.objects, no una URL publica.
-- Ruta de cada fichero: "{nino_id}/{fecha}.{ext}" — el primer
-- segmento de la ruta (foldername) es el nino_id, y las politicas
-- comprueban la propiedad/vinculo contra ese segmento igual que en
-- el resto de tablas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-ninos', 'fotos-ninos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- La cuidadora/guarderia sube (y puede reemplazar) la foto de sus
-- propios ninos. No hay politica de SELECT para ella a proposito:
-- una vez subida, no puede volver a verla (regla del brief de
-- privacidad). El upload con upsert:true necesita tanto insert
-- como update.
create policy "cuidadora_sube_fotos"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-ninos'
    and exists (
      select 1 from public.ninos n
      where n.id::text = (storage.foldername(name))[1]
        and n.cuenta_id = auth.uid()
    )
  );

create policy "cuidadora_reemplaza_fotos"
  on storage.objects for update
  with check (
    bucket_id = 'fotos-ninos'
    and exists (
      select 1 from public.ninos n
      where n.id::text = (storage.foldername(name))[1]
        and n.cuenta_id = auth.uid()
    )
  );

-- Solo el padre/madre vinculado a ese nino concreto puede ver (y
-- por tanto generar un enlace firmado para descargar) su foto.
-- Ningun otro padre, ni terceros.
create policy "padre_ve_fotos"
  on storage.objects for select
  using (
    bucket_id = 'fotos-ninos'
    and exists (
      select 1 from public.nino_padre np
      where np.nino_id::text = (storage.foldername(name))[1]
        and np.padre_id = auth.uid()
    )
  );
