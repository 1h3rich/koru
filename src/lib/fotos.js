const BUCKET = 'fotos-ninos'

// Sube la foto del dia para un nino. Usa el cliente normal (con
// RLS): la propia RLS de storage.objects exige que quien sube sea
// la cuenta propietaria de ese nino.
//
// OJO: nunca usar upsert:true aqui. La cuidadora no tiene (a
// proposito) permiso de lectura sobre este bucket una vez subida
// una foto — es la regla de privacidad del brief. upsert necesita
// comprobar si el objeto ya existe (algo equivalente a un SELECT),
// y sin ese permiso la subida entera falla con un error de RLS
// aunque la politica de INSERT sea correcta. Por eso cada foto usa
// un nombre unico (con timestamp): nunca hay conflicto que
// comprobar, así que un INSERT normal basta.
export async function subirFoto(supabase, ninoId, fecha, file) {
  if (!file || file.size === 0) return null

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const ruta = `${ninoId}/${fecha}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, {
    contentType: file.type,
  })
  if (error) throw error

  return ruta
}

// Genera un enlace firmado y temporal para ver/descargar una foto.
// Solo funciona si quien llama tiene permiso de SELECT segun la RLS
// (el padre vinculado a ese nino) — para la cuidadora o cualquier
// otra persona, esto falla y devuelve null.
export async function urlFirmadaFoto(supabase, ruta, { descargar = false } = {}) {
  if (!ruta) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(ruta, 60 * 10, descargar ? { download: true } : undefined)
  if (error) return null
  return data.signedUrl
}
