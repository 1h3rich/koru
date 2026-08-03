'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Aprueba una cuenta pendiente. Usa el cliente admin (service role)
// porque el operador no es el propietario de esa fila, y la RLS de
// "cuentas" solo deja a cada cuenta tocar la suya. Re-comprueba el
// email de admin aquí también, por si se llama esta action fuera de
// /admin (defensa en profundidad).
export async function aprobarCuenta(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/inicio')
  }

  const cuenta_id = formData.get('cuenta_id')?.toString()
  const admin = createAdminClient()
  await admin.from('cuentas').update({ aprobada: true }).eq('id', cuenta_id)

  redirect('/admin')
}
