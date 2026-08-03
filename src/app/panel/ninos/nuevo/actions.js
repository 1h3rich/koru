'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { avatares } from '@/lib/avatares'

// Da de alta un niño nuevo para la cuenta autenticada. Solo la
// cuidadora/guardería puede crear niños (RLS: cuenta_id = auth.uid()).
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

  const avatarValido = avatares.some((a) => a.id === avatar_id)

  if (!nombre || !apellido_inicial || !avatarValido) {
    redirect('/panel/ninos/nuevo?error=datos_invalidos')
  }

  const { error } = await supabase.from('ninos').insert({
    cuenta_id: user.id,
    nombre,
    apellido_inicial,
    avatar_id,
    aula,
    fecha_nacimiento,
  })

  if (error) {
    // El índice único ninos_avatar_unico_activo salta si el avatar
    // ya lo tiene otro niño activo de esta misma cuenta.
    const mensaje = error.code === '23505' ? 'avatar_en_uso' : 'no_se_pudo_crear'
    redirect(`/panel/ninos/nuevo?error=${mensaje}`)
  }

  redirect('/panel')
}
