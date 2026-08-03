create policy "debug_update_abierta"
  on storage.objects for update
  using (bucket_id = 'fotos-ninos')
  with check (bucket_id = 'fotos-ninos');
