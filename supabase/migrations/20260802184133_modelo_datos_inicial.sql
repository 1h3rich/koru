-- Modulo 3: modelo de datos + RLS
-- Entidades: cuentas (guarderia/cuidadora), ninos, nino_padre (vinculo N:M).
-- Los padres NUNCA tienen fila propia mas alla de auth.users: solo se
-- relacionan con sus ninos a traves de nino_padre.

-- ============================================================
-- cuentas: una guarderia o cuidadora individual = un login.
-- 1:1 con auth.users, sin tabla de staff separada (MVP sin
-- sobreingenieria: un unico usuario gestiona el panel).
-- ============================================================
create table public.cuentas (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_negocio text not null,
  tipo text not null check (tipo in ('guarderia', 'cuidadora')),
  created_at timestamptz not null default now()
);

alter table public.cuentas enable row level security;

create policy "cuentas_select_propia"
  on public.cuentas for select
  using (auth.uid() = id);

create policy "cuentas_insert_propia"
  on public.cuentas for insert
  with check (auth.uid() = id);

create policy "cuentas_update_propia"
  on public.cuentas for update
  using (auth.uid() = id);

-- ============================================================
-- ninos: registros de datos gestionados por la cuenta, nunca
-- tienen login propio. Diferenciacion visual acordada: avatar
-- (unico entre ninos activos de la misma cuenta) + inicial del
-- apellido (nunca apellido completo, minimizacion RGPD) + aula.
-- ============================================================
create table public.ninos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  nombre text not null,
  apellido_inicial text not null check (char_length(apellido_inicial) between 1 and 3),
  -- Debe coincidir con el nombre de fichero (sin extension) en
  -- public/icons/**/*.svg y con su entrada en src/lib/creditos.js.
  avatar_id text not null check (
    avatar_id in (
      -- Animales
      'ciervo', 'conejo', 'elefante', 'jirafa', 'koala', 'leon', 'oso',
      'panda', 'tigre', 'zorro', 'dragon', 'cerberus', 'chimera', 'fenix',
      -- Avatares de superheroe
      'super-arbol', 'super-espadas', 'super-estrella', 'super-guerrera',
      'super-hombre', 'super-insecto', 'super-morado', 'super-mujer',
      'super-normal', 'super-rayo', 'super-rey', 'super-rojo', 'super-verde'
    )
  ),
  aula text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Un avatar no puede repetirse entre ninos activos de la misma cuenta.
-- Al desactivar un nino (activo = false) su avatar queda libre de nuevo.
create unique index ninos_avatar_unico_activo
  on public.ninos (cuenta_id, avatar_id)
  where activo;

alter table public.ninos enable row level security;

-- La cuidadora/guarderia ve y gestiona sus propios ninos.
create policy "ninos_select_cuenta_propietaria"
  on public.ninos for select
  using (cuenta_id = auth.uid());

create policy "ninos_insert_cuenta_propietaria"
  on public.ninos for insert
  with check (cuenta_id = auth.uid());

create policy "ninos_update_cuenta_propietaria"
  on public.ninos for update
  using (cuenta_id = auth.uid());

create policy "ninos_delete_cuenta_propietaria"
  on public.ninos for delete
  using (cuenta_id = auth.uid());

-- ============================================================
-- nino_padre: vinculo N:M. Un nino puede tener varios padres/
-- tutores; un padre puede tener varios ninos. Solo la cuenta
-- propietaria del nino decide que padre lo ve (alta/baja de
-- accesos desde el panel de la cuidadora/guarderia).
-- ============================================================
create table public.nino_padre (
  nino_id uuid not null references public.ninos (id) on delete cascade,
  padre_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (nino_id, padre_id)
);

alter table public.nino_padre enable row level security;

-- La cuidadora/guarderia gestiona los vinculos de sus propios ninos.
create policy "nino_padre_select_cuenta_propietaria"
  on public.nino_padre for select
  using (
    exists (
      select 1
      from public.ninos n
      where n.id = nino_padre.nino_id
        and n.cuenta_id = auth.uid()
    )
  );

create policy "nino_padre_insert_cuenta_propietaria"
  on public.nino_padre for insert
  with check (
    exists (
      select 1
      from public.ninos n
      where n.id = nino_padre.nino_id
        and n.cuenta_id = auth.uid()
    )
  );

create policy "nino_padre_delete_cuenta_propietaria"
  on public.nino_padre for delete
  using (
    exists (
      select 1
      from public.ninos n
      where n.id = nino_padre.nino_id
        and n.cuenta_id = auth.uid()
    )
  );

-- Un padre puede ver sus propios vinculos (para saber a que ninos
-- tiene acceso), pero no crearlos ni borrarlos.
create policy "nino_padre_select_padre_propio"
  on public.nino_padre for select
  using (padre_id = auth.uid());

-- Un padre ve solo los ninos que la cuidadora le ha vinculado
-- explicitamente en nino_padre (definida aqui porque depende de
-- que la tabla nino_padre ya exista).
create policy "ninos_select_padre_vinculado"
  on public.ninos for select
  using (
    exists (
      select 1
      from public.nino_padre np
      where np.nino_id = ninos.id
        and np.padre_id = auth.uid()
    )
  );
