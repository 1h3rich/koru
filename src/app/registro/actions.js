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
  const nombre_educador = formData.get('nombre_educador')?.toString().trim()
  const edad = Number(formData.get('edad'))

  if (!nombre_negocio || !nombre_educador || !['guarderia', 'cuidadora'].includes(tipo)) {
    redirect('/registro?error=datos_invalidos')
  }
  if (!Number.isInteger(edad) || edad < 16 || edad > 100) {
    redirect('/registro?error=edad_invalida')
  }

  const { error } = await supabase.from('cuentas').insert({
    id: user.id,
    nombre_negocio,
    tipo,
    nombre_educador,
    edad,
  })

  if (error) {
    redirect('/registro?error=no_se_pudo_crear')
  }

  redirect('/panel')
}
