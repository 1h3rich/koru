import { createClient } from '@/lib/supabase/server'
import { urlFirmadaDocumentoCuenta } from '@/lib/documentosCuenta'

const ETIQUETA_CATEGORIA = {
  autorizacion: '📋 Autorización',
  menu: '🍽️ Menú',
  normas: '📜 Normas',
  circular: '📰 Circular',
  otro: '📄 Otro',
}

export default async function DocumentosPadrePage() {
  const supabase = await createClient()

  const { data: documentos } = await supabase
    .from('documentos_cuenta')
    .select('id, categoria, nombre, ruta, created_at')
    .order('created_at', { ascending: false })

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d) => ({ ...d, url: await urlFirmadaDocumentoCuenta(supabase, d.ruta) }))
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">📚 Biblioteca documental</h1>
      <p className="mt-1 text-sm text-muted-foreground">Normas, circulares, menús y autorizaciones.</p>

      {documentosConUrl.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Todavía no hay documentos.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {documentosConUrl.map((d) => (
            <li key={d.id} className="rounded-2xl border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">{ETIQUETA_CATEGORIA[d.categoria]}</p>
              {d.url ? (
                <a href={d.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  {d.nombre}
                </a>
              ) : (
                <p className="text-sm">{d.nombre}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
