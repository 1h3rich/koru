// Las API keys de plan gratuito de DeepL terminan en ":fx" y usan el
// dominio api-free.deepl.com en vez de api.deepl.com — todo lo demás
// es igual.
function urlDeepL() {
  const esGratis = process.env.DEEPL_API_KEY?.endsWith(':fx')
  return esGratis ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'
}

export async function traducirTexto(texto, idiomaDestino) {
  if (!process.env.DEEPL_API_KEY || !texto?.trim()) return null

  try {
    const respuesta = await fetch(urlDeepL(), {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [texto], target_lang: idiomaDestino.toUpperCase() }),
    })
    if (!respuesta.ok) return null

    const datos = await respuesta.json()
    return datos.translations?.[0]?.text ?? null
  } catch {
    return null
  }
}
