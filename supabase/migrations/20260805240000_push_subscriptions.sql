-- Suscripciones de notificaciones push (Web Push nativo del
-- navegador + VAPID, sin proveedor de terceros). Cada dispositivo
-- donde el usuario activa notificaciones añade una fila.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_propio"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_propio"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions_update_propio"
  on public.push_subscriptions for update
  using (user_id = auth.uid());

create policy "push_subscriptions_delete_propio"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());
