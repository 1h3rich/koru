'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarEmail } from '@/lib/email'
import { emailBienvenidaPadre } from '@/lib/plantillasEmail'

// Vincula un padre a un niño por su email. Si el padre no tiene
// cuenta todavía, inviteUserByEmail crea su usuario de auth.users y
// le envía el correo de invitación; si ya existe (caso normal
// cuando ya tiene otro hijo vinculado), lo buscamos entre los
// usuarios existentes. Nota: listUsers() está paginado (50 por
// página) — válido para el volumen de esta app, revisar si el
// número de usuarios crece mucho.
export async function vincularPadre(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const email = formData.get('email')?.toString().trim().toLowerCase()

  if (!nino_id) {
    redirect('/panel')
  }
  if (!email) {
    redirect(`/panel/ninos/${nino_id}?error=datos_invalidos`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Confirma que el niño es de esta cuenta antes de tocar la API de administración.
  const { data: nino } = await supabase
    .from('ninos')
    .select('id, nombre')
    .eq('id', nino_id)
    .eq('cuenta_id', user.id)
    .maybeSingle()

  if (!nino) {
    redirect('/panel')
  }

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('nombre_negocio')
    .eq('id', user.id)
    .maybeSingle()

  const admin = createAdminClient()
  let padreId

  const invitacion = await admin.auth.admin.inviteUserByEmail(email)
  if (invitacion.error) {
    const { data: listado } = await admin.auth.admin.listUsers()
    const existente = listado?.users.find((u) => u.email === email)
    if (!existente) {
      redirect(`/panel/ninos/${nino_id}?error=no_se_pudo_invitar`)
    }
    padreId = existente.id
  } else {
    padreId = invitacion.data.user.id
  }

  const { error } = await supabase.from('nino_padre').insert({
    nino_id,
    padre_id: padreId,
  })

  if (error) {
    // 23505 = unique_violation: ya estaba vinculado (PK nino_id+padre_id).
    const mensaje = error.code === '23505' ? 'ya_vinculado' : 'no_se_pudo_vincular'
    redirect(`/panel/ninos/${nino_id}?error=${mensaje}`)
  }

  await enviarEmail({
    to: email,
    subject: `Ya tienes acceso al diario de ${nino.nombre} en Koru`,
    html: emailBienvenidaPadre({ nombreNino: nino.nombre, nombreNegocio: cuenta?.nombre_negocio }),
  })

  redirect(`/panel/ninos/${nino_id}`)
}

export async function anadirObjeto(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const objeto = formData.get('objeto')?.toString().trim()
  if (!nino_id || !objeto) {
    redirect(`/panel/ninos/${nino_id}`)
  }

  const supabase = await createClient()
  await supabase.from('objetos_personales').insert({ nino_id, objeto })

  redirect(`/panel/ninos/${nino_id}`)
}

export async function borrarObjeto(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('objetos_personales').delete().eq('id', id)
  redirect(`/panel/ninos/${nino_id}`)
}

// Quita el acceso de un padre a un niño. No borra su cuenta de
// usuario, solo el vínculo — puede seguir teniendo acceso a otros
// niños.
export async function desvincularPadre(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const padre_id = formData.get('padre_id')?.toString()

  if (!nino_id || !padre_id) {
    redirect('/panel')
  }

  const supabase = await createClient()
  await supabase
    .from('nino_padre')
    .delete()
    .eq('nino_id', nino_id)
    .eq('padre_id', padre_id)

  redirect(`/panel/ninos/${nino_id}`)
}
