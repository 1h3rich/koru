-- Diagnostico temporal: politica siempre-verdadera para el mismo
-- bucket, para descartar que el problema sea el bucket/grants y no
-- la condicion de auth.uid().
create policy "debug_insert_abierta"
  on storage.objects for insert
  with check (bucket_id = 'fotos-ninos');
