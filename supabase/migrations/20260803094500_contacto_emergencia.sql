-- Modulo 9: telefono de contacto rapido, opt-in por parte del padre,
-- visible para la cuidadora en caso de emergencia. Vive en
-- nino_padre (no en un perfil aparte) porque es exactamente ahi
-- donde ya se modela la relacion padre-nino.

alter table public.nino_padre
  add column telefono_emergencia text;

-- El padre puede actualizar su propio telefono de contacto (y solo
-- ese dato: nino_id/padre_id son la clave primaria, no tiene sentido
-- que el padre las cambie, y la app nunca las envia en este update).
create policy "nino_padre_update_padre_propio"
  on public.nino_padre for update
  using (padre_id = auth.uid())
  with check (padre_id = auth.uid());
