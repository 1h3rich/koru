-- Limpieza de todo lo creado durante la depuracion del bug de
-- fotos (ver commits/migraciones anteriores del mismo dia). El
-- causante real era usar upsert:true sin permiso de SELECT para la
-- cuidadora — arreglado en el codigo (src/lib/fotos.js) usando
-- nombres de fichero unicos en vez de upsert. Nada de esto hace
-- falta en produccion.
drop policy if exists "debug_insert_abierta" on storage.objects;
drop policy if exists "debug_update_abierta" on storage.objects;
drop policy if exists "debug_libre_insert" on storage.objects;
drop policy if exists "debug_libre_select" on storage.objects;

drop function if exists public.debug_fotos(text);
drop function if exists public.debug_policies();
drop function if exists public.debug_policies_v2();
