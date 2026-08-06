'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const CONCEPTOS_VALIDOS = ['mensualidad', 'comedor', 'horas_extra', 'material', 'otro']

export async function crearCuota(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const concepto = formData.get('concepto')?.toString()
  const descripcion = formData.get('descripcion')?.toString().trim() || null
  const periodo = formData.get('periodo')?.toString().trim()
  const importeTexto = formData.get('importe')?.toString().trim()

  if (!nino_id || !CONCEPTOS_VALIDOS.includes(concepto) || !periodo) {
    redirect(`/panel/ninos/${nino_id}/facturacion?error=datos_invalidos`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  await supabase.from('cuotas').insert({
    nino_id,
    concepto,
    descripcion,
    periodo,
    importe: importeTexto ? Number(importeTexto) : null,
    creado_por: user.id,
  })

  redirect(`/panel/ninos/${nino_id}/facturacion`)
}

export async function marcarCuota(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const estado = formData.get('estado')?.toString()

  const supabase = await createClient()
  await supabase.from('cuotas').update({ estado }).eq('id', id)

  redirect(`/panel/ninos/${nino_id}/facturacion`)
}

export async function borrarCuota(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()

  const supabase = await createClient()
  await supabase.from('cuotas').delete().eq('id', id)

  redirect(`/panel/ninos/${nino_id}/facturacion`)
}
