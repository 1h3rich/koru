'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const DIAS_VALIDOS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export async function crearHorario(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const aula = formData.get('aula')?.toString().trim() || null
  const dia_semana = formData.get('dia_semana')?.toString()
  const hora = formData.get('hora')?.toString()
  const actividad = formData.get('actividad')?.toString().trim()

  if (!DIAS_VALIDOS.includes(dia_semana) || !hora || !actividad) {
    redirect('/panel/horarios?error=datos_invalidos')
  }

  const { error } = await supabase.from('horarios_semanales').insert({
    cuenta_id: user.id,
    aula,
    dia_semana,
    hora,
    actividad,
  })

  if (error) {
    redirect('/panel/horarios?error=no_se_pudo_crear')
  }

  redirect('/panel/horarios')
}

export async function borrarHorario(formData) {
  const id = formData.get('id')?.toString()
  const supabase = await createClient()
  await supabase.from('horarios_semanales').delete().eq('id', id)
  redirect('/panel/horarios')
}

export async function crearRutina(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const aula = formData.get('aula')?.toString().trim() || null
  const hora = formData.get('hora')?.toString()
  const actividad = formData.get('actividad')?.toString().trim()

  if (!hora || !actividad) {
    redirect('/panel/horarios?error=datos_invalidos')
  }

  const { error } = await supabase.from('rutina_diaria').insert({
    cuenta_id: user.id,
    aula,
    hora,
    actividad,
  })

  if (error) {
    redirect('/panel/horarios?error=no_se_pudo_crear')
  }

  redirect('/panel/horarios')
}

export async function borrarRutina(formData) {
  const id = formData.get('id')?.toString()
  const supabase = await createClient()
  await supabase.from('rutina_diaria').delete().eq('id', id)
  redirect('/panel/horarios')
}
