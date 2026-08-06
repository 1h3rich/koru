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

// Guarda la suscripción de notificaciones push del dispositivo
// actual. Se llama directo desde un componente cliente (no un
// <form>), por eso recibe el objeto ya serializado en vez de
// FormData.
export async function guardarSuscripcionPush(suscripcion) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !suscripcion?.endpoint) return

  await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: suscripcion.endpoint,
      p256dh: suscripcion.keys.p256dh,
      auth: suscripcion.keys.auth,
    },
    { onConflict: 'endpoint' }
  )
}
