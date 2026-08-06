import { enviarEmail } from '@/lib/email'
import { emailBienvenidaPadre } from '@/lib/plantillasEmail'

// Vincula un padre a un niño por su email, e invita a su cuenta si
// no existe todavía. Compartido entre el alta de niño y la ficha del
// niño (donde también se puede añadir/reintentar un padre suelto).
// listUsers() está paginado (50 por página) — válido para el
// volumen de esta app, revisar si el número de usuarios crece mucho.
export async function vincularPadreANino({ supabase, admin, ninoId, ninoNombre, nombreNegocio, email }) {
  let padreId

  const invitacion = await admin.auth.admin.inviteUserByEmail(email)
  if (invitacion.error) {
    const { data: listado } = await admin.auth.admin.listUsers()
    const existente = listado?.users.find((u) => u.email === email)
    if (!existente) {
      return { ok: false, codigo: 'no_se_pudo_invitar' }
    }
    padreId = existente.id
  } else {
    padreId = invitacion.data.user.id
  }

  const { error } = await supabase.from('nino_padre').insert({
    nino_id: ninoId,
    padre_id: padreId,
  })

  if (error) {
    // 23505 = unique_violation: ya estaba vinculado (PK nino_id+padre_id).
    return { ok: false, codigo: error.code === '23505' ? 'ya_vinculado' : 'no_se_pudo_vincular' }
  }

  await enviarEmail({
    to: email,
    subject: `Ya tienes acceso al diario de ${ninoNombre} en Koru`,
    html: emailBienvenidaPadre({ nombreNino: ninoNombre, nombreNegocio }),
  })

  return { ok: true }
}
