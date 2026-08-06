const BUCKET = 'adjuntos-mensajes'

export function tipoAdjunto(mimeType) {
  if (mimeType?.startsWith('image/')) return 'imagen'
  if (mimeType?.startsWith('video/')) return 'video'
  return null
}

export async function subirAdjuntoMensaje(supabase, ninoId, file) {
  if (!file || file.size === 0) return null
  const ruta = `${ninoId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type })
  if (error) throw error
  return ruta
}

export async function urlFirmadaAdjuntoMensaje(supabase, ruta) {
  if (!ruta) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 60 * 10)
  if (error) return null
  return data.signedUrl
}
