create function public.debug_policies()
returns table (policyname name, cmd text, qual text, with_check text)
language sql
security definer
stable
as $$
  select policyname, cmd::text, qual, with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects';
$$;
