'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enviarEmail } from '@/lib/email'

export async function reportarProblema(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const mensaje = formData.get('mensaje')?.toString().trim()
  if (!mensaje) {
    redirect('/acerca-de?error=falta_mensaje')
  }

  if (process.env.ADMIN_EMAIL) {
    await enviarEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'Koru — Reporte de un problema',
      html: `
        <p><strong>De:</strong> ${user?.email ?? 'usuario no identificado'}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${mensaje.replace(/\n/g, '<br>')}</p>
      `,
    })
  }

  redirect('/acerca-de?enviado=1')
}
