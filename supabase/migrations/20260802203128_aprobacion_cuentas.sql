-- No cualquiera puede operar una cuenta de guarderia/cuidadora: se
-- puede rellenar el formulario de alta libremente, pero la cuenta
-- nace "no aprobada" y no puede crear ninos ni nada mas hasta que
-- el propio desarrollador la apruebe a mano (UPDATE directo en
-- Supabase, no hace falta panel de administracion para el volumen
-- actual).
alter table public.cuentas add column aprobada boolean not null default false;

-- Helper para no repetir la subconsulta en cada politica: usa
-- security invoker (por defecto) a proposito, así respeta la RLS de
-- "cuentas" (cada cuenta solo puede leer su propia fila).
create function public.cuenta_aprobada()
returns boolean
language sql
stable
as $$
  select coalesce((select aprobada from public.cuentas where id = auth.uid()), false);
$$;

-- Solo cuentas aprobadas pueden crear ninos.
drop policy "ninos_insert_cuenta_propietaria" on public.ninos;
create policy "ninos_insert_cuenta_propietaria"
  on public.ninos for insert
  with check (cuenta_id = auth.uid() and public.cuenta_aprobada());

-- Solo cuentas aprobadas pueden vincular padres.
drop policy "nino_padre_insert_cuenta_propietaria" on public.nino_padre;
create policy "nino_padre_insert_cuenta_propietaria"
  on public.nino_padre for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = nino_padre.nino_id and n.cuenta_id = auth.uid()
    )
    and public.cuenta_aprobada()
  );

-- Solo cuentas aprobadas pueden crear registros diarios, asistencia
-- y horario semanal.
drop policy "registros_diarios_insert_cuenta_propietaria" on public.registros_diarios;
create policy "registros_diarios_insert_cuenta_propietaria"
  on public.registros_diarios for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = registros_diarios.nino_id and n.cuenta_id = auth.uid()
    )
    and public.cuenta_aprobada()
  );

drop policy "asistencia_insert_cuenta_propietaria" on public.asistencia;
create policy "asistencia_insert_cuenta_propietaria"
  on public.asistencia for insert
  with check (
    exists (
      select 1 from public.ninos n
      where n.id = asistencia.nino_id and n.cuenta_id = auth.uid()
    )
    and public.cuenta_aprobada()
  );

drop policy "horarios_semanales_insert_cuenta_propietaria" on public.horarios_semanales;
create policy "horarios_semanales_insert_cuenta_propietaria"
  on public.horarios_semanales for insert
  with check (cuenta_id = auth.uid() and public.cuenta_aprobada());
