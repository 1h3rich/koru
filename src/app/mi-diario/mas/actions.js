'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function guardarTelefonoEmergencia(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const telefono_emergencia = formData.get('telefono_emergencia')?.toString().trim() || null
  if (!nino_id) {
    redirect('/mi-diario/mas')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('nino_padre')
    .update({ telefono_emergencia })
    .eq('nino_id', nino_id)
    .eq('padre_id', user.id)

  redirect('/mi-diario/mas?contacto_guardado=1')
}
