'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { padresDelAula, notificarNuevoMensajeAula } from '@/lib/notificaciones'

export async function enviarMensajeAulaCuidadora(formData) {
  const aula = formData.get('aula')?.toString()
  const contenido = formData.get('contenido')?.toString().trim()
  if (!aula || !contenido) {
    redirect('/panel/mensajes')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('mensajes_aula').insert({
    cuenta_id: user.id,
    aula,
    autor_id: user.id,
    contenido,
  })

  if (!error) {
    const { emails, ids } = await padresDelAula(user.id, aula)
    await notificarNuevoMensajeAula({
      aula,
      emails,
      ids,
      contenido,
      urlDestino: `/mi-diario/aula`,
    })
  }

  redirect(`/panel/aulas/${encodeURIComponent(aula)}/mensajes`)
}
