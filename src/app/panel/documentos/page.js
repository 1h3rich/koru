import { createClient } from '@/lib/supabase/server'
import { urlFirmadaDocumentoCuenta } from '@/lib/documentosCuenta'
import { Button, Cabecera, Field, Input, Mensaje, Select } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { subirDocumentoCuentaAction, borrarDocumentoCuentaAction } from './actions'

const ETIQUETA_CATEGORIA = {
  autorizacion: '📋 Autorización',
  menu: '🍽️ Menú',
  normas: '📜 Normas',
  circular: '📰 Circular',
  otro: '📄 Otro',
}

const MENSAJES_ERROR = {
  datos_invalidos: 'Elige una categoría y un archivo.',
}

export default async function DocumentosPage({ searchParams }) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: documentos } = await supabase
    .from('documentos_cuenta')
    .select('id, categoria, nombre, ruta, created_at')
    .order('created_at', { ascending: false })

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d) => ({ ...d, url: await urlFirmadaDocumentoCuenta(supabase, d.ruta) }))
  )

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <Cabecera
          volver="/panel/mas"
          titulo="📚 Biblioteca documental"
          subtitulo="Visible para todas las familias vinculadas."
        />

        <form action={subirDocumentoCuentaAction} className="mb-6 space-y-3 rounded-2xl border border-border p-4">
          <div className="flex gap-3">
            <div className="w-40">
              <Field label="Categoría">
                <Select name="categoria" required defaultValue="circular">
                  {Object.entries(ETIQUETA_CATEGORIA).map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Archivo">
              <Input type="file" name="archivo" required className="flex-1" />
            </Field>
          </div>
          <Button type="submit" className="w-full">
            Subir
          </Button>
          <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
        </form>

        {documentosConUrl.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay documentos.</p>
        ) : (
          <ul className="space-y-2">
            {documentosConUrl.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{ETIQUETA_CATEGORIA[d.categoria]}</p>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                      {d.nombre}
                    </a>
                  ) : (
                    <p className="text-sm">{d.nombre}</p>
                  )}
                </div>
                <form action={borrarDocumentoCuentaAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="ruta" value={d.ruta} />
                  <Button type="submit" variant="ghost">
                    Quitar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
