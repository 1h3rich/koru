'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Server Action compartida por /panel y /mi-diario para cerrar sesion.
export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Tema claro/oscuro forzado manualmente (ver globals.css, data-tema
// en <html>). Cookie en vez de columna de "cuentas" porque tambien
// lo puede elegir un padre/madre, que no tiene fila en "cuentas".
export async function guardarTema(formData) {
  const destino = formData.get('destino')?.toString() || '/'
  const tema = formData.get('tema')?.toString()

  const cookieStore = await cookies()
  if (tema === 'claro' || tema === 'oscuro') {
    cookieStore.set('tema', tema, { maxAge: 60 * 60 * 24 * 365, path: '/' })
  } else {
    cookieStore.delete('tema')
  }

  redirect(`${destino}?guardado=1`)
}
