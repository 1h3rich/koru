import { createClient } from '@supabase/supabase-js'

// Cliente con la service role key: SOLO para Server Actions o Route
// Handlers, nunca importar desde un Client Component ni exponer al
// navegador. Hace falta para que la cuidadora pueda vincular a un
// padre por su email desde el panel antes de que ese padre haya
// iniciado sesion nunca (admin.inviteUserByEmail crea el usuario
// de auth.users si todavia no existe).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
