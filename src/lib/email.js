import { Resend } from 'resend'

// Notificaciones por email a los padres (Resend, plan gratuito, ya
// previsto en el stack original). Se usa el dominio de pruebas de
// Resend (onboarding@resend.dev) por defecto — funciona sin
// verificar un dominio propio, sustituir cuando haya uno.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function enviarEmail({ to, subject, html }) {
  if (!resend) {
    console.warn('RESEND_API_KEY no configurada: email no enviado.', subject)
    return
  }
  try {
    await resend.emails.send({
      from: 'Koru <onboarding@resend.dev>',
      to,
      subject,
      html,
    })
  } catch (error) {
    // Un fallo de email nunca debe romper el guardado del registro.
    console.error('Error enviando email:', error)
  }
}
