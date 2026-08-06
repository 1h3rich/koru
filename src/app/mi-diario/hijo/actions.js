'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { subirDocumento, borrarDocumento } from '@/lib/documentos'

export async function crearAlergia(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const alergeno = formData.get('alergeno')?.toString().trim()
  const notas = formData.get('notas')?.toString().trim() || null
  if (!nino_id || !alergeno) {
    redirect(`/mi-diario/hijo?nino=${nino_id}`)
  }

  const supabase = await createClient()
  await supabase.from('alergias').insert({ nino_id, alergeno, notas })

  redirect(`/mi-diario/hijo?nino=${nino_id}`)
}

export async function borrarAlergia(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('alergias').delete().eq('id', id)
  redirect(`/mi-diario/hijo?nino=${nino_id}`)
}

export async function crearPersonaAutorizada(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  const dni = formData.get('dni')?.toString().trim() || null
  const telefono = formData.get('telefono')?.toString().trim() || null
  const parentesco = formData.get('parentesco')?.toString().trim() || null
  if (!nino_id || !nombre) {
    redirect(`/mi-diario/hijo?nino=${nino_id}`)
  }

  const supabase = await createClient()
  await supabase.from('personas_autorizadas').insert({ nino_id, nombre, dni, telefono, parentesco })

  redirect(`/mi-diario/hijo?nino=${nino_id}`)
}

export async function borrarPersonaAutorizada(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('personas_autorizadas').delete().eq('id', id)
  redirect(`/mi-diario/hijo?nino=${nino_id}`)
}

export async function subirDocumentoPadre(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const file = formData.get('archivo')
  if (!nino_id || !file || file.size === 0) {
    redirect(`/mi-diario/hijo?nino=${nino_id}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const ruta = await subirDocumento(supabase, nino_id, file)
  await supabase.from('documentos_nino').insert({
    nino_id,
    nombre: file.name,
    ruta,
    autor_id: user.id,
  })

  redirect(`/mi-diario/hijo?nino=${nino_id}`)
}

export async function borrarDocumentoNino(formData) {
  const id = formData.get('id')?.toString()
  const ruta = formData.get('ruta')?.toString()
  const nino_id = formData.get('nino_id')?.toString()

  const supabase = await createClient()
  await supabase.from('documentos_nino').delete().eq('id', id)
  await borrarDocumento(supabase, ruta)

  redirect(`/mi-diario/hijo?nino=${nino_id}`)
}
