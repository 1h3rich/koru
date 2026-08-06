'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { padresDelAula, notificarAvisoAula } from '@/lib/notificaciones'

export async function crearAviso(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const aula = formData.get('aula')?.toString().trim() || null
  const titulo = formData.get('titulo')?.toString().trim()
  const mensaje = formData.get('mensaje')?.toString().trim()
  const requiere_autorizacion = formData.get('requiere_autorizacion') === 'on'

  if (!titulo || !mensaje) {
    redirect('/panel/avisos?error=datos_invalidos')
  }

  const { error } = await supabase
    .from('avisos')
    .insert({ cuenta_id: user.id, aula, titulo, mensaje, requiere_autorizacion })

  if (error) {
    redirect('/panel/avisos?error=no_se_pudo_crear')
  }

  const { emails, ids } = await padresDelAula(user.id, aula)
  await notificarAvisoAula({ emails, ids, titulo, mensaje, requiereAutorizacion: requiere_autorizacion })

  redirect('/panel/avisos')
}

export async function borrarAviso(formData) {
  const id = formData.get('id')?.toString()
  const supabase = await createClient()
  await supabase.from('avisos').delete().eq('id', id)
  redirect('/panel/avisos')
}
