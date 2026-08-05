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
  const edadTexto = formData.get('edad')?.toString()
  const edad = edadTexto ? Number(edadTexto) : null

  if (edad !== null && (!Number.isInteger(edad) || edad < 16 || edad > 100)) {
    redirect('/panel/mas?error=edad_invalida')
  }

  await supabase.from('cuentas').update({ nombre_educador, edad }).eq('id', user.id)

  redirect('/panel/mas?guardado=1')
}
