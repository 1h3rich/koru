-- Código QR de check-in/check-out, uno por padre/madre. La
-- cuidadora lo escanea con la cámara normal del móvil (abre un
-- enlace, no hace falta lector dentro de la app) para marcar entrada
-- o salida de sus niños vinculados de un toque.
create table public.qr_checkin_tokens (
  padre_id uuid primary key references auth.users (id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

alter table public.qr_checkin_tokens enable row level security;

create policy "qr_checkin_tokens_select_propio"
  on public.qr_checkin_tokens for select
  using (padre_id = auth.uid());

create policy "qr_checkin_tokens_insert_propio"
  on public.qr_checkin_tokens for insert
  with check (padre_id = auth.uid());

create policy "qr_checkin_tokens_update_propio"
  on public.qr_checkin_tokens for update
  using (padre_id = auth.uid());
