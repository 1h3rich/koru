'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { subirDocumentoCuenta, borrarDocumentoCuenta } from '@/lib/documentosCuenta'

const CATEGORIAS_VALIDAS = ['autorizacion', 'menu', 'normas', 'circular', 'otro']

export async function subirDocumentoCuentaAction(formData) {
  const categoria = formData.get('categoria')?.toString()
  const file = formData.get('archivo')
  if (!CATEGORIAS_VALIDAS.includes(categoria) || !file || file.size === 0) {
    redirect('/panel/documentos?error=datos_invalidos')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const ruta = await subirDocumentoCuenta(supabase, user.id, file)
  await supabase.from('documentos_cuenta').insert({
    cuenta_id: user.id,
    categoria,
    nombre: file.name,
    ruta,
  })

  redirect('/panel/documentos')
}

export async function borrarDocumentoCuentaAction(formData) {
  const id = formData.get('id')?.toString()
  const ruta = formData.get('ruta')?.toString()

  const supabase = await createClient()
  await supabase.from('documentos_cuenta').delete().eq('id', id)
  await borrarDocumentoCuenta(supabase, ruta)

  redirect('/panel/documentos')
}
