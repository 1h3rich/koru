'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Crea la fila en "cuentas" para el usuario autenticado. Nace con
// aprobada=false (ver migracion aprobacion_cuentas): no puede
// operar el panel hasta que el desarrollador la apruebe desde /admin.
export async function crearCuenta(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const nombre_negocio = formData.get('nombre_negocio')?.toString().trim()
  const tipo = formData.get('tipo')?.toString()

  if (!nombre_negocio || !['guarderia', 'cuidadora'].includes(tipo)) {
    redirect('/registro?error=datos_invalidos')
  }

  const { error } = await supabase.from('cuentas').insert({
    id: user.id,
    nombre_negocio,
    tipo,
  })

  if (error) {
    redirect('/registro?error=no_se_pudo_crear')
  }

  redirect('/panel')
}
