'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cuidadoraDe, notificarNuevoMensaje } from '@/lib/notificaciones'
import { subirAdjuntoMensaje, tipoAdjunto } from '@/lib/adjuntosMensajes'

export async function enviarMensajePadre(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const contenido = formData.get('contenido')?.toString().trim() ?? ''
  const archivo = formData.get('archivo')
  const hayArchivo = archivo && archivo.size > 0

  if (!nino_id || (!contenido && !hayArchivo)) {
    redirect(`/mi-diario/mensajes?nino=${nino_id}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  let adjunto_url = null
  let adjunto_tipo = null
  if (hayArchivo) {
    try {
      adjunto_url = await subirAdjuntoMensaje(supabase, nino_id, archivo)
      adjunto_tipo = tipoAdjunto(archivo.type)
    } catch {
      redirect(`/mi-diario/mensajes?nino=${nino_id}`)
    }
  }

  const { error } = await supabase
    .from('mensajes')
    .insert({ nino_id, autor_id: user.id, contenido, adjunto_url, adjunto_tipo })

  if (!error) {
    const destinatarios = await cuidadoraDe(nino_id)
    await notificarNuevoMensaje({
      nino_id,
      destinatarios,
      contenido: contenido || (adjunto_tipo === 'video' ? '🎥 Vídeo nuevo' : '📷 Foto nueva'),
      urlDestino: `/panel/ninos/${nino_id}/mensajes`,
    })
  }

  redirect(`/mi-diario/mensajes?nino=${nino_id}`)
}
