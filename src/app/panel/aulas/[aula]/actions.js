'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const CAMPOS_COLECTIVOS = ['comida', 'siesta', 'estado_animo']

// Pasa lista de golpe: marca la hora de entrada (ahora mismo) de
// todos los niños activos del aula que todavía no la tengan hoy. El
// pañal y la temperatura quedan fuera a propósito — son datos
// individuales, nunca colectivos.
export async function pasarListaAula(formData) {
  const aula = formData.get('aula')?.toString()
  if (!aula) {
    redirect('/panel')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const fecha = new Date().toISOString().slice(0, 10)
  const hora_entrada = new Date().toTimeString().slice(0, 5)

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id')
    .eq('aula', aula)
    .eq('activo', true)

  const { data: yaMarcados } = await supabase
    .from('asistencia')
    .select('nino_id')
    .eq('fecha', fecha)
    .not('hora_entrada', 'is', null)
    .in('nino_id', (ninos ?? []).map((n) => n.id))

  const idsMarcados = new Set((yaMarcados ?? []).map((a) => a.nino_id))
  const pendientes = (ninos ?? []).filter((n) => !idsMarcados.has(n.id))

  if (pendientes.length > 0) {
    await supabase.from('asistencia').upsert(
      pendientes.map((n) => ({ nino_id: n.id, fecha, hora_entrada, creado_por: user.id })),
      { onConflict: 'nino_id,fecha' }
    )
  }

  redirect(`/panel/aulas/${encodeURIComponent(aula)}`)
}

// Aplica un mismo valor (comida/siesta/animo) al registro de hoy de
// todos los niños activos del aula seleccionados. Nunca toca pañal
// ni temperatura, que son siempre individuales.
export async function aplicarColectivoAula(formData) {
  const aula = formData.get('aula')?.toString()
  const campo = formData.get('campo')?.toString()
  const valor = formData.get('valor')?.toString()
  const ninoIds = formData.getAll('nino_id').map((v) => v.toString())

  if (!aula || !CAMPOS_COLECTIVOS.includes(campo) || !valor || ninoIds.length === 0) {
    redirect(`/panel/aulas/${encodeURIComponent(aula ?? '')}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const fecha = new Date().toISOString().slice(0, 10)

  await supabase.from('registros_diarios').upsert(
    ninoIds.map((nino_id) => ({ nino_id, fecha, [campo]: valor, creado_por: user.id })),
    { onConflict: 'nino_id,fecha' }
  )

  redirect(`/panel/aulas/${encodeURIComponent(aula)}`)
}
