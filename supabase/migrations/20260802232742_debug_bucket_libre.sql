create policy "debug_libre_insert"
  on storage.objects for insert
  with check (bucket_id = 'debug-sin-restricciones');

create policy "debug_libre_select"
  on storage.objects for select
  using (bucket_id = 'debug-sin-restricciones');
