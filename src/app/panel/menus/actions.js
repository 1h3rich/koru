'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const DIAS_VALIDOS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const COMIDAS_VALIDAS = ['desayuno', 'almuerzo', 'merienda']

export async function crearPlatoMenu(formData) {
  const aula = formData.get('aula')?.toString().trim() || null
  const dia_semana = formData.get('dia_semana')?.toString()
  const comida = formData.get('comida')?.toString()
  const plato = formData.get('plato')?.toString().trim()
  const alergenos = formData.get('alergenos')?.toString().trim() || null

  if (!DIAS_VALIDOS.includes(dia_semana) || !COMIDAS_VALIDAS.includes(comida) || !plato) {
    redirect('/panel/menus?error=datos_invalidos')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  await supabase.from('menu_semanal').insert({ cuenta_id: user.id, aula, dia_semana, comida, plato, alergenos })

  redirect('/panel/menus')
}

export async function borrarPlatoMenu(formData) {
  const id = formData.get('id')?.toString()
  const supabase = await createClient()
  await supabase.from('menu_semanal').delete().eq('id', id)
  redirect('/panel/menus')
}
