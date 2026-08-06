const BUCKET = 'documentos-cuenta'

export async function subirDocumentoCuenta(supabase, cuentaId, file) {
  if (!file || file.size === 0) return null
  const ruta = `${cuentaId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type })
  if (error) throw error
  return ruta
}

export async function urlFirmadaDocumentoCuenta(supabase, ruta) {
  if (!ruta) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 60 * 10)
  if (error) return null
  return data.signedUrl
}

export async function borrarDocumentoCuenta(supabase, ruta) {
  if (!ruta) return
  await supabase.storage.from(BUCKET).remove([ruta])
}
