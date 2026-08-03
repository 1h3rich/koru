-- Bug real encontrado probando el flujo completo con datos reales:
-- "infinite recursion detected in policy for relation ninos".
-- ninos_select_padre_vinculado consulta nino_padre, y las politicas
-- de nino_padre consultan ninos: cada consulta a cualquiera de las
-- dos tablas disparaba a la otra en bucle. Las funciones security
-- definer evaluan su consulta interna sin volver a disparar RLS
-- (corren como el propietario de la tabla, exento de su propia
-- RLS), cortando el ciclo en ambas direcciones.

create function public.nino_es_de_mi_cuenta(p_nino_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from ninos where id = p_nino_id and cuenta_id = auth.uid()
  );
$$;

create function public.soy_padre_vinculado(p_nino_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from nino_padre where nino_id = p_nino_id and padre_id = auth.uid()
  );
$$;

drop policy "ninos_select_padre_vinculado" on public.ninos;
create policy "ninos_select_padre_vinculado"
  on public.ninos for select
  using (public.soy_padre_vinculado(id));

drop policy "nino_padre_select_cuenta_propietaria" on public.nino_padre;
create policy "nino_padre_select_cuenta_propietaria"
  on public.nino_padre for select
  using (public.nino_es_de_mi_cuenta(nino_id));

drop policy "nino_padre_insert_cuenta_propietaria" on public.nino_padre;
create policy "nino_padre_insert_cuenta_propietaria"
  on public.nino_padre for insert
  with check (public.nino_es_de_mi_cuenta(nino_id) and public.cuenta_aprobada());

drop policy "nino_padre_delete_cuenta_propietaria" on public.nino_padre;
create policy "nino_padre_delete_cuenta_propietaria"
  on public.nino_padre for delete
  using (public.nino_es_de_mi_cuenta(nino_id));
