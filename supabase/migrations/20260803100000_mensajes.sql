-- Modulo 10: chat privado cuidadora<->padre, por nino (no por
-- familia entera: si un padre tiene varios ninos en la misma
-- guarderia, cada nino tiene su propia conversacion, igual que el
-- resto de la app es siempre nino-centrica). Sin adjuntos, sin
-- recibos de lectura -- eso puede llegar despues si hace falta,
-- de momento el aviso es por email cuando llega un mensaje nuevo.

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  nino_id uuid not null references public.ninos (id) on delete cascade,
  autor_id uuid not null references auth.users (id) on delete cascade,
  contenido text not null,
  created_at timestamptz not null default now()
);

create index mensajes_nino_fecha_idx on public.mensajes (nino_id, created_at);

alter table public.mensajes enable row level security;

create policy "mensajes_select_cuenta_propietaria"
  on public.mensajes for select
  using (
    exists (
      select 1 from public.ninos n
      where n.id = mensajes.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "mensajes_insert_cuenta_propietaria"
  on public.mensajes for insert
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.ninos n
      where n.id = mensajes.nino_id and n.cuenta_id = auth.uid()
    )
  );

create policy "mensajes_select_padre_vinculado"
  on public.mensajes for select
  using (
    exists (
      select 1 from public.nino_padre np
      where np.nino_id = mensajes.nino_id and np.padre_id = auth.uid()
    )
  );

create policy "mensajes_insert_padre_vinculado"
  on public.mensajes for insert
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.nino_padre np
      where np.nino_id = mensajes.nino_id and np.padre_id = auth.uid()
    )
  );

-- Necesario para que Supabase Realtime retransmita los INSERT de
-- esta tabla a los clientes suscritos (no viene activado por tabla
-- por defecto).
alter publication supabase_realtime add table public.mensajes;
