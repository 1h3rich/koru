create function public.debug_fotos(p_name text)
returns table (uid uuid, segmento text, nino_encontrado boolean, cuenta_id_nino uuid)
language sql
security invoker
stable
as $$
  select
    auth.uid(),
    (storage.foldername(p_name))[1],
    exists (
      select 1 from public.ninos n
      where n.id::text = (storage.foldername(p_name))[1]
        and n.cuenta_id = auth.uid()
    ),
    (select cuenta_id from public.ninos where id::text = (storage.foldername(p_name))[1])
$$;

create function public.debug_policies()
returns table (policyname name, cmd text, qual text, with_check text)
language sql
security definer
stable
as $$
  select policyname, cmd, qual, with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects';
$$;
