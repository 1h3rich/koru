create function public.debug_policies_v2()
returns table (policyname name, permissive text, cmd text, roles name[])
language sql
security definer
stable
as $$
  select policyname, permissive, cmd::text, roles
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects';
$$;
