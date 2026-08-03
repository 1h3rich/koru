'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { padresDe, notificarNuevoMensaje } from '@/lib/notificaciones'

export async function enviarMensajeCuidadora(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const contenido = formData.get('contenido')?.toString().trim()
  if (!nino_id || !contenido) {
    redirect(`/panel/ninos/${nino_id}/mensajes`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('mensajes').insert({ nino_id, autor_id: user.id, contenido })

  if (!error) {
    const destinatarios = await padresDe(nino_id)
    await notificarNuevoMensaje({
      nino_id,
      destinatarios,
      contenido,
      urlDestino: `/mi-diario/mensajes?nino=${nino_id}`,
    })
  }

  redirect(`/panel/ninos/${nino_id}/mensajes`)
}
