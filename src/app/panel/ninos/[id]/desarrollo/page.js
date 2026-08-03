import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button, Cabecera, Field, Input, Mensaje, Select, Textarea } from '@/components/ui'
import { anadirObservacion, borrarObservacion } from './actions'

const AREAS = ['motricidad', 'lenguaje', 'socializacion', 'creatividad', 'autonomia']
const ETIQUETA_AREA = {
  motricidad: '🏃 Motricidad',
  lenguaje: '🗣️ Lenguaje',
  socializacion: '🤝 Socialización',
  creatividad: '🎨 Creatividad',
  autonomia: '🧑 Autonomía',
}

const MENSAJES_ERROR = {
  datos_invalidos: 'Elige un área, una fecha y escribe una observación.',
  no_se_pudo_guardar: 'Ha habido un problema al guardar. Inténtalo de nuevo.',
}

export default async function DesarrolloPage({ params, searchParams }) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: nino } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial')
    .eq('id', id)
    .maybeSingle()

  if (!nino) {
    notFound()
  }

  const { data: observaciones } = await supabase
    .from('observaciones_desarrollo')
    .select('id, area, fecha, texto')
    .eq('nino_id', id)
    .order('fecha')

  const porArea = AREAS.map((area) => ({
    area,
    items: (observaciones ?? []).filter((o) => o.area === area),
  }))

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Cabecera
        volver={`/panel/ninos/${nino.id}`}
        titulo={`📈 Desarrollo · ${nino.nombre} ${nino.apellido_inicial}.`}
        subtitulo="Observaciones por área a lo largo del curso."
      />

      <form action={anadirObservacion} className="mb-8 space-y-3 rounded-2xl border border-border p-4">
        <input type="hidden" name="nino_id" value={nino.id} />
        <div className="flex gap-3">
          <div className="w-44">
            <Field label="Área">
              <Select name="area" required defaultValue="">
                <option value="" disabled>
                  Elegir
                </option>
                {AREAS.map((area) => (
                  <option key={area} value={area}>
                    {ETIQUETA_AREA[area]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-40">
            <Field label="Fecha">
              <Input type="date" name="fecha" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>
          </div>
        </div>
        <Field label="Observación">
          <Textarea
            name="texto"
            rows={2}
            required
            placeholder="Ej: Se le da bien caminar, todavía no corre."
          />
        </Field>
        <Button type="submit" className="w-full">
          Añadir observación
        </Button>
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </form>

      <div className="space-y-6">
        {porArea.map(({ area, items }) => (
          <div key={area}>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">{ETIQUETA_AREA[area]}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin observaciones todavía.</p>
            ) : (
              <ol className="space-y-2 border-l-2 border-border pl-4">
                {items.map((o) => (
                  <li key={o.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="flex items-start justify-between gap-2 rounded-2xl border border-border px-4 py-2.5">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-sm">{o.texto}</p>
                      </div>
                      <form action={borrarObservacion}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="nino_id" value={nino.id} />
                        <Button type="submit" variant="ghost">
                          Quitar
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
