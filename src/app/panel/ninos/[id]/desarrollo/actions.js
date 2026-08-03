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
