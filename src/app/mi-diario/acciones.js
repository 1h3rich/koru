'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function confirmarAviso(formData) {
  const aviso_id = formData.get('aviso_id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  if (!aviso_id || !nino_id) {
    redirect('/mi-diario')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  await supabase.from('avisos_confirmaciones').insert({ aviso_id, nino_id, confirmado_por: user.id })

  redirect(`/mi-diario?nino=${nino_id}`)
}
