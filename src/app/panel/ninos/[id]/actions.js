'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { vincularPadreANino } from '@/lib/vincularPadre'
import { subirDocumento, borrarDocumento } from '@/lib/documentos'

export async function vincularPadre(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const email = formData.get('email')?.toString().trim().toLowerCase()

  if (!nino_id) {
    redirect('/panel')
  }
  if (!email) {
    redirect(`/panel/ninos/${nino_id}?error=datos_invalidos`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Confirma que el niño es de esta cuenta antes de tocar la API de administración.
  const { data: nino } = await supabase
    .from('ninos')
    .select('id, nombre')
    .eq('id', nino_id)
    .eq('cuenta_id', user.id)
    .maybeSingle()

  if (!nino) {
    redirect('/panel')
  }

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('nombre_negocio')
    .eq('id', user.id)
    .maybeSingle()

  const admin = createAdminClient()
  const resultado = await vincularPadreANino({
    supabase,
    admin,
    ninoId: nino_id,
    ninoNombre: nino.nombre,
    nombreNegocio: cuenta?.nombre_negocio,
    email,
  })

  if (!resultado.ok) {
    redirect(`/panel/ninos/${nino_id}?error=${resultado.codigo}`)
  }

  redirect(`/panel/ninos/${nino_id}`)
}

export async function anadirObjeto(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const objeto = formData.get('objeto')?.toString().trim()
  if (!nino_id || !objeto) {
    redirect(`/panel/ninos/${nino_id}`)
  }

  const supabase = await createClient()
  await supabase.from('objetos_personales').insert({ nino_id, objeto })

  redirect(`/panel/ninos/${nino_id}`)
}

export async function borrarObjeto(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('objetos_personales').delete().eq('id', id)
  redirect(`/panel/ninos/${nino_id}`)
}

export async function crearIncidencia(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const descripcion = formData.get('descripcion')?.toString().trim()
  if (!nino_id || !descripcion) {
    redirect(`/panel/ninos/${nino_id}`)
  }

  const supabase = await createClient()
  await supabase.from('incidencias').insert({ nino_id, descripcion })

  redirect(`/panel/ninos/${nino_id}`)
}

export async function borrarIncidencia(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('incidencias').delete().eq('id', id)
  redirect(`/panel/ninos/${nino_id}`)
}

export async function subirDocumentoCuidadora(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const file = formData.get('archivo')
  if (!nino_id || !file || file.size === 0) {
    redirect(`/panel/ninos/${nino_id}`)
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

  redirect(`/panel/ninos/${nino_id}`)
}

export async function borrarDocumentoNinoCuidadora(formData) {
  const id = formData.get('id')?.toString()
  const ruta = formData.get('ruta')?.toString()
  const nino_id = formData.get('nino_id')?.toString()

  const supabase = await createClient()
  await supabase.from('documentos_nino').delete().eq('id', id)
  await borrarDocumento(supabase, ruta)

  redirect(`/panel/ninos/${nino_id}`)
}

// Quita el acceso de un padre a un niño. No borra su cuenta de
// usuario, solo el vínculo — puede seguir teniendo acceso a otros
// niños.
export async function desvincularPadre(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const padre_id = formData.get('padre_id')?.toString()

  if (!nino_id || !padre_id) {
    redirect('/panel')
  }

  const supabase = await createClient()
  await supabase
    .from('nino_padre')
    .delete()
    .eq('nino_id', nino_id)
    .eq('padre_id', padre_id)

  redirect(`/panel/ninos/${nino_id}`)
}
