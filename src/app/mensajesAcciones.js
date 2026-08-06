'use server'

import { createClient } from '@/lib/supabase/server'
import { traducirTexto } from '@/lib/traduccion'

// Compartida por ambos lados del chat privado (cuidadora y padre):
// marca como leídos, con la hora actual, todos los mensajes de esa
// conversación que no escribió el usuario actual y que aún no
// tenían confirmación de lectura. Se llama directo desde Chat.js
// (componente cliente), no desde un <form>.
export async function marcarMensajesLeidos(ninoId) {
  if (!ninoId) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('mensajes')
    .update({ leido_en: new Date().toISOString() })
    .eq('nino_id', ninoId)
    .neq('autor_id', user.id)
    .is('leido_en', null)
}

// Traduce bajo demanda, sin guardar nada — se llama directo desde
// Chat.js al pulsar "Traducir" en un mensaje concreto.
export async function traducirMensaje(texto, idiomaDestino) {
  return traducirTexto(texto, idiomaDestino)
}
