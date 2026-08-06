import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button, Cabecera, Field, Input, Mensaje, Select, Textarea } from '@/components/ui'
import { HITOS_DESARROLLO } from '@/lib/hitosDesarrollo'
import {
  anadirObservacion,
  borrarObservacion,
  alternarHito,
  crearEvaluacion,
  borrarEvaluacion,
} from './actions'

const ETIQUETA_NIVEL = { inicial: 'Inicial', en_proceso: 'En proceso', logrado: 'Logrado' }

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

  const [{ data: observaciones }, { data: hitosAlcanzados }, { data: evaluaciones }] = await Promise.all([
    supabase.from('observaciones_desarrollo').select('id, area, fecha, texto').eq('nino_id', id).order('fecha'),
    supabase.from('hitos_desarrollo_nino').select('area, hito, fecha_alcanzado').eq('nino_id', id),
    supabase
      .from('evaluaciones_desarrollo')
      .select('id, area, fecha, nivel, notas')
      .eq('nino_id', id)
      .order('fecha', { ascending: false }),
  ])

  const hitosAlcanzadosSet = new Set((hitosAlcanzados ?? []).map((h) => `${h.area}:${h.hito}`))

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

      <div className="mb-8 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">✅ Hitos de desarrollo</h2>
        {AREAS.map((area) => (
          <div key={area}>
            <p className="mb-1.5 text-sm font-medium">{ETIQUETA_AREA[area]}</p>
            <div className="flex flex-wrap gap-2">
              {HITOS_DESARROLLO[area].map((hito) => {
                const alcanzado = hitosAlcanzadosSet.has(`${area}:${hito}`)
                return (
                  <form key={hito} action={alternarHito}>
                    <input type="hidden" name="nino_id" value={nino.id} />
                    <input type="hidden" name="area" value={area} />
                    <input type="hidden" name="hito" value={hito} />
                    <input type="hidden" name="alcanzado" value={String(alcanzado)} />
                    <button
                      type="submit"
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        alcanzado
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {alcanzado ? '✅ ' : ''}
                      {hito}
                    </button>
                  </form>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 space-y-3 rounded-2xl border border-border p-4">
        <h2 className="text-sm font-medium">📝 Evaluaciones periódicas</h2>
        {evaluaciones && evaluaciones.length > 0 && (
          <ul className="space-y-2">
            {evaluaciones.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between rounded-2xl bg-muted px-3 py-2 text-sm">
                <span>
                  {ETIQUETA_AREA[ev.area]} · {ETIQUETA_NIVEL[ev.nivel]} ·{' '}
                  {new Date(ev.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                  {ev.notas && <span className="text-muted-foreground"> — {ev.notas}</span>}
                </span>
                <form action={borrarEvaluacion}>
                  <input type="hidden" name="id" value={ev.id} />
                  <input type="hidden" name="nino_id" value={nino.id} />
                  <button type="submit" className="text-xs text-muted-foreground underline">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={crearEvaluacion} className="flex flex-wrap gap-2">
          <input type="hidden" name="nino_id" value={nino.id} />
          <div className="w-40">
            <Select name="area" required defaultValue="">
              <option value="" disabled>Área</option>
              {AREAS.map((area) => (
                <option key={area} value={area}>{ETIQUETA_AREA[area]}</option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Select name="nivel" required defaultValue="en_proceso">
              {Object.entries(ETIQUETA_NIVEL).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </Select>
          </div>
          <Input name="notas" placeholder="Notas (opcional)" className="flex-1" />
          <Button type="submit" variant="secondary">Añadir</Button>
        </form>
      </div>

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
