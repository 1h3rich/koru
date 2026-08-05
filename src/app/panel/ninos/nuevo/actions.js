'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { avatares } from '@/lib/avatares'
import { vincularPadreANino } from '@/lib/vincularPadre'

// Da de alta un niño nuevo para la cuenta autenticada. Solo la
// cuidadora/guardería puede crear niños (RLS: cuenta_id = auth.uid()).
// El email de un padre/madre es obligatorio: un niño sin nadie
// vinculado no tiene sentido en la app, así que se invita en el
// mismo paso. El segundo email es opcional (el otro padre/madre).
export async function crearNino(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const nombre = formData.get('nombre')?.toString().trim()
  const apellido_inicial = formData.get('apellido_inicial')?.toString().trim()
  const avatar_id = formData.get('avatar_id')?.toString()
  const aula = formData.get('aula')?.toString().trim() || null
  const fecha_nacimiento = formData.get('fecha_nacimiento')?.toString() || null
  const email_padre_1 = formData.get('email_padre_1')?.toString().trim().toLowerCase()
  const email_padre_2 = formData.get('email_padre_2')?.toString().trim().toLowerCase() || null

  const avatarValido = avatares.some((a) => a.id === avatar_id)

  if (!nombre || !apellido_inicial || !avatarValido) {
    redirect('/panel/ninos/nuevo?error=datos_invalidos')
  }
  if (!email_padre_1) {
    redirect('/panel/ninos/nuevo?error=falta_email_padre')
  }

  const { data: nino, error } = await supabase
    .from('ninos')
    .insert({
      cuenta_id: user.id,
      nombre,
      apellido_inicial,
      avatar_id,
      aula,
      fecha_nacimiento,
    })
    .select('id, nombre')
    .single()

  if (error) {
    // El índice único ninos_avatar_unico_activo salta si el avatar
    // ya lo tiene otro niño activo de esta misma cuenta.
    const mensaje = error.code === '23505' ? 'avatar_en_uso' : 'no_se_pudo_crear'
    redirect(`/panel/ninos/nuevo?error=${mensaje}`)
  }

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('nombre_negocio')
    .eq('id', user.id)
    .maybeSingle()

  const admin = createAdminClient()

  const resultado = await vincularPadreANino({
    supabase,
    admin,
    ninoId: nino.id,
    ninoNombre: nino.nombre,
    nombreNegocio: cuenta?.nombre_negocio,
    email: email_padre_1,
  })

  if (email_padre_2) {
    // El segundo padre/madre es opcional: si falla, no bloqueamos el
    // alta — se puede reintentar desde la ficha del niño.
    await vincularPadreANino({
      supabase,
      admin,
      ninoId: nino.id,
      ninoNombre: nino.nombre,
      nombreNegocio: cuenta?.nombre_negocio,
      email: email_padre_2,
    })
  }

  if (!resultado.ok) {
    redirect(`/panel/ninos/${nino.id}?error=${resultado.codigo}`)
  }

  redirect(`/panel/ninos/${nino.id}?creado=1`)
}
