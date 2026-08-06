-- Confirmación de lectura para el chat privado (mensajes). El chat
-- grupal por aula queda fuera a propósito: con varios destinatarios
-- distintos "leído" ya no es un solo instante, sino una lista por
-- persona -- se puede añadir más adelante si hace falta.
alter table public.mensajes add column leido_en timestamptz;

-- UPDATE reutiliza el mismo alcance que ya tenían las políticas de
-- SELECT: cada lado del chat puede marcar como leídos los mensajes
-- que ya podía ver.
create policy "mensajes_update_cuenta_propietaria"
  on public.mensajes for update
  using (exists (select 1 from public.ninos n where n.id = mensajes.nino_id and n.cuenta_id = auth.uid()));

create policy "mensajes_update_padre_vinculado"
  on public.mensajes for update
  using (exists (select 1 from public.nino_padre np where np.nino_id = mensajes.nino_id and np.padre_id = auth.uid()));
