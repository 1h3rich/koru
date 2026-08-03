'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cuidadoraDe, notificarNuevoMensaje } from '@/lib/notificaciones'

export async function enviarMensajePadre(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const contenido = formData.get('contenido')?.toString().trim()
  if (!nino_id || !contenido) {
    redirect(`/mi-diario/mensajes?nino=${nino_id}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('mensajes').insert({ nino_id, autor_id: user.id, contenido })

  if (!error) {
    const destinatarios = await cuidadoraDe(nino_id)
    await notificarNuevoMensaje({
      nino_id,
      destinatarios,
      contenido,
      urlDestino: `/panel/ninos/${nino_id}/mensajes`,
    })
  }

  redirect(`/mi-diario/mensajes?nino=${nino_id}`)
}
