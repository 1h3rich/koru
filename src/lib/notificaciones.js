import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail } from '@/lib/email'

const URL_APP = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Emails de los padres vinculados a un nino (para que la cuidadora
// les avise de algo). Devuelve null si no hay ninguno vinculado.
export async function padresDe(nino_id) {
  const supabase = await createClient()
  const { data: nino } = await supabase.from('ninos').select('nombre').eq('id', nino_id).maybeSingle()
  const { data: vinculos } = await supabase.from('nino_padre').select('padre_id').eq('nino_id', nino_id)
  if (!nino || !vinculos || vinculos.length === 0) return null

  const admin = createAdminClient()
  const emails = (
    await Promise.all(
      vinculos.map(async ({ padre_id }) => {
        const { data } = await admin.auth.admin.getUserById(padre_id)
        return data?.user?.email
      })
    )
  ).filter(Boolean)

  return emails.length > 0 ? { nombreNino: nino.nombre, emails } : null
}

// El email de la cuidadora/guarderia de un nino (para avisarle de un
// mensaje nuevo de un padre).
export async function cuidadoraDe(nino_id) {
  const supabase = await createClient()
  const { data: nino } = await supabase.from('ninos').select('nombre, cuenta_id').eq('id', nino_id).maybeSingle()
  if (!nino) return null

  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(nino.cuenta_id)
  const email = data?.user?.email
  return email ? { nombreNino: nino.nombre, email } : null
}

// El email de la cuidadora/guarderia directamente por cuenta_id (para
// el chat grupal por aula, donde ya se conoce la cuenta sin pasar
// por un nino concreto).
export async function emailDeCuenta(cuenta_id) {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(cuenta_id)
  return data?.user?.email ?? null
}

// Emails (sin duplicados) de todos los padres vinculados a algún
// nino de una cuenta+aula. aula=null significa "toda la cuenta", no
// solo los ninos sin aula asignada -- para avisos generales.
export async function padresDelAula(cuenta_id, aula) {
  const supabase = await createClient()
  let consulta = supabase.from('ninos').select('id').eq('cuenta_id', cuenta_id).eq('activo', true)
  if (aula) {
    consulta = consulta.eq('aula', aula)
  }
  const { data: ninos } = await consulta
  if (!ninos || ninos.length === 0) return []

  const { data: vinculos } = await supabase
    .from('nino_padre')
    .select('padre_id')
    .in('nino_id', ninos.map((n) => n.id))
  if (!vinculos || vinculos.length === 0) return []

  const admin = createAdminClient()
  const emails = (
    await Promise.all(
      [...new Set(vinculos.map((v) => v.padre_id))].map(async (padre_id) => {
        const { data } = await admin.auth.admin.getUserById(padre_id)
        return data?.user?.email
      })
    )
  ).filter(Boolean)

  return emails
}

export async function notificarAvisoAula({ emails, titulo, mensaje, requiereAutorizacion }) {
  if (!emails || emails.length === 0) return

  const html = `
    <p>📢 <strong>${titulo}</strong></p>
    <p>${mensaje}</p>
    ${requiereAutorizacion ? '<p><strong>Este aviso necesita tu confirmación en la app.</strong></p>' : ''}
    <p><a href="${URL_APP}/mi-diario">Ver en Koru</a></p>
  `

  await Promise.all(emails.map((email) => enviarEmail({ to: email, subject: titulo, html })))
}

export async function notificarNuevoMensaje({ nino_id, destinatarios, contenido, urlDestino }) {
  if (!destinatarios) return

  const html = `
    <p>💬 Tienes un mensaje nuevo sobre <strong>${destinatarios.nombreNino}</strong>:</p>
    <p>${contenido}</p>
    <p><a href="${URL_APP}${urlDestino}">Ver en Koru</a></p>
  `

  const emails = destinatarios.emails ?? [destinatarios.email]
  await Promise.all(
    emails.map((email) =>
      enviarEmail({ to: email, subject: `Mensaje nuevo sobre ${destinatarios.nombreNino}`, html })
    )
  )
}

export async function notificarNuevoMensajeAula({ aula, emails, contenido, urlDestino }) {
  if (!emails || emails.length === 0) return

  const html = `
    <p>💬 Mensaje nuevo en el chat de <strong>${aula}</strong>:</p>
    <p>${contenido}</p>
    <p><a href="${URL_APP}${urlDestino}">Ver en Koru</a></p>
  `

  await Promise.all(
    emails.map((email) =>
      enviarEmail({ to: email, subject: `Mensaje nuevo en el chat de ${aula}`, html })
    )
  )
}
