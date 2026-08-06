'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const AREAS_VALIDAS = ['motricidad', 'lenguaje', 'socializacion', 'creatividad', 'autonomia']

export async function anadirObservacion(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const area = formData.get('area')?.toString()
  const fecha = formData.get('fecha')?.toString()
  const texto = formData.get('texto')?.toString().trim()
  if (!nino_id) {
    redirect('/panel')
  }
  if (!AREAS_VALIDAS.includes(area) || !fecha || !texto) {
    redirect(`/panel/ninos/${nino_id}/desarrollo?error=datos_invalidos`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('observaciones_desarrollo')
    .insert({ nino_id, area, fecha, texto, creado_por: user.id })

  if (error) {
    redirect(`/panel/ninos/${nino_id}/desarrollo?error=no_se_pudo_guardar`)
  }

  redirect(`/panel/ninos/${nino_id}/desarrollo`)
}

export async function borrarObservacion(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('observaciones_desarrollo').delete().eq('id', id)
  redirect(`/panel/ninos/${nino_id}/desarrollo`)
}

// Marca/desmarca un hito del catálogo fijo (src/lib/hitosDesarrollo.js).
export async function alternarHito(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const area = formData.get('area')?.toString()
  const hito = formData.get('hito')?.toString()
  const alcanzado = formData.get('alcanzado')?.toString() === 'true'

  if (!nino_id || !AREAS_VALIDAS.includes(area) || !hito) {
    redirect(`/panel/ninos/${nino_id}/desarrollo`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  if (alcanzado) {
    await supabase.from('hitos_desarrollo_nino').delete().eq('nino_id', nino_id).eq('area', area).eq('hito', hito)
  } else {
    await supabase
      .from('hitos_desarrollo_nino')
      .insert({ nino_id, area, hito, creado_por: user.id })
  }

  redirect(`/panel/ninos/${nino_id}/desarrollo`)
}

const NIVELES_VALIDOS = ['inicial', 'en_proceso', 'logrado']

export async function crearEvaluacion(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const area = formData.get('area')?.toString()
  const nivel = formData.get('nivel')?.toString()
  const notas = formData.get('notas')?.toString().trim() || null

  if (!nino_id || !AREAS_VALIDAS.includes(area) || !NIVELES_VALIDOS.includes(nivel)) {
    redirect(`/panel/ninos/${nino_id}/desarrollo?error=datos_invalidos`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  await supabase.from('evaluaciones_desarrollo').insert({ nino_id, area, nivel, notas, creado_por: user.id })

  redirect(`/panel/ninos/${nino_id}/desarrollo`)
}

export async function borrarEvaluacion(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('evaluaciones_desarrollo').delete().eq('id', id)
  redirect(`/panel/ninos/${nino_id}/desarrollo`)
}
