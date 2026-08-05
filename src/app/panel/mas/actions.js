'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function actualizarNombreEducador(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const nombre_educador = formData.get('nombre_educador')?.toString().trim() || null

  await supabase.from('cuentas').update({ nombre_educador }).eq('id', user.id)

  redirect('/panel/mas?guardado=1')
}
