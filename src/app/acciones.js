'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Server Action compartida por /panel y /mi-diario para cerrar sesion.
export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
