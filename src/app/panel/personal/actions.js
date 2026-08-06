'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function crearEmpleado(formData) {
  const nombre = formData.get('nombre')?.toString().trim()
  const turno = formData.get('turno')?.toString().trim() || null
  if (!nombre) {
    redirect('/panel/personal?error=falta_nombre')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  await supabase.from('empleados').insert({ cuenta_id: user.id, nombre, turno })

  redirect('/panel/personal')
}

export async function borrarEmpleado(formData) {
  const id = formData.get('id')?.toString()
  const supabase = await createClient()
  await supabase.from('empleados').delete().eq('id', id)
  redirect('/panel/personal')
}

const TIPOS_VALIDOS = ['vacaciones', 'sustitucion', 'baja', 'otro']

export async function crearAusenciaPersonal(formData) {
  const empleado_id = formData.get('empleado_id')?.toString()
  const tipo = formData.get('tipo')?.toString()
  const fecha_inicio = formData.get('fecha_inicio')?.toString()
  const fecha_fin = formData.get('fecha_fin')?.toString()
  const sustituto = formData.get('sustituto')?.toString().trim() || null
  const notas = formData.get('notas')?.toString().trim() || null

  if (!empleado_id || !TIPOS_VALIDOS.includes(tipo) || !fecha_inicio || !fecha_fin) {
    redirect('/panel/personal?error=datos_invalidos')
  }

  const supabase = await createClient()
  await supabase
    .from('ausencias_personal')
    .insert({ empleado_id, tipo, fecha_inicio, fecha_fin, sustituto, notas })

  redirect('/panel/personal')
}

export async function borrarAusenciaPersonal(formData) {
  const id = formData.get('id')?.toString()
  const supabase = await createClient()
  await supabase.from('ausencias_personal').delete().eq('id', id)
  redirect('/panel/personal')
}
