'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const TIPOS_VALIDOS = ['excursion', 'festivo', 'cumpleanos', 'otro']

export async function crearEvento(formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const aula = formData.get('aula')?.toString().trim() || null
  const fecha = formData.get('fecha')?.toString()
  const tipo = formData.get('tipo')?.toString()
  const titulo = formData.get('titulo')?.toString().trim()
  const nota = formData.get('nota')?.toString().trim() || null

  if (!fecha || !TIPOS_VALIDOS.includes(tipo) || !titulo) {
    redirect('/panel/calendario?error=datos_invalidos')
  }

  const { error } = await supabase.from('eventos').insert({
    cuenta_id: user.id,
    aula,
    fecha,
    tipo,
    titulo,
    nota,
  })

  if (error) {
    redirect('/panel/calendario?error=no_se_pudo_crear')
  }

  redirect('/panel/calendario')
}

export async function borrarEvento(formData) {
  const id = formData.get('id')?.toString()
  const supabase = await createClient()
  await supabase.from('eventos').delete().eq('id', id)
  redirect('/panel/calendario')
}
