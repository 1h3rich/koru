const BUCKET = 'documentos-ninos'

// Sube un documento (DNI, autorización...) de un niño. A diferencia
// de fotos.js, aquí tanto la cuidadora como el padre/madre tienen
// permiso de lectura, así que sí se puede usar upsert con
// tranquilidad si hiciera falta — de momento, igual que las fotos,
// cada subida usa un nombre único para evitar conflictos.
export async function subirDocumento(supabase, ninoId, file) {
  if (!file || file.size === 0) return null

  const ruta = `${ninoId}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, {
    contentType: file.type,
  })
  if (error) throw error

  return ruta
}

export async function urlFirmadaDocumento(supabase, ruta) {
  if (!ruta) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 60 * 10)
  if (error) return null
  return data.signedUrl
}

export async function borrarDocumento(supabase, ruta) {
  if (!ruta) return
  await supabase.storage.from(BUCKET).remove([ruta])
}
