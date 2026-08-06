'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { emailDeCuenta, notificarNuevoMensajeAula } from '@/lib/notificaciones'

export async function enviarMensajeAulaPadre(formData) {
  const cuenta_id = formData.get('cuenta_id')?.toString()
  const aula = formData.get('aula')?.toString()
  const contenido = formData.get('contenido')?.toString().trim()
  if (!cuenta_id || !aula || !contenido) {
    redirect('/mi-diario/aula')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('mensajes_aula').insert({
    cuenta_id,
    aula,
    autor_id: user.id,
    contenido,
  })

  if (!error) {
    const email = await emailDeCuenta(cuenta_id)
    await notificarNuevoMensajeAula({
      aula,
      emails: email ? [email] : [],
      ids: [cuenta_id],
      contenido,
      urlDestino: `/panel/aulas/${encodeURIComponent(aula)}/mensajes`,
    })
  }

  redirect('/mi-diario/aula')
}
