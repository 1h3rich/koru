import { Resend } from 'resend'

// Notificaciones por email a los padres (Resend, plan gratuito, ya
// previsto en el stack original). Requiere que el dominio koru.onl
// esté verificado en Resend (resend.com/domains) — si no lo está,
// el envío falla para cualquier destinatario que no sea el dueño de
// la cuenta de Resend.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function enviarEmail({ to, subject, html }) {
  if (!resend) {
    console.warn('RESEND_API_KEY no configurada: email no enviado.', subject)
    return
  }
  try {
    await resend.emails.send({
      from: 'Koru <notificaciones@koru.onl>',
      to,
      subject,
      html,
    })
  } catch (error) {
    // Un fallo de email nunca debe romper el guardado del registro.
    console.error('Error enviando email:', error)
  }
}
