import { createClient } from '@/lib/supabase/server'
import { avatares } from '@/lib/avatares'
import { calcularEdad } from '@/lib/edad'
import { urlFirmadaFoto } from '@/lib/fotos'
import { Card } from '@/components/ui'

const ETIQUETA_COMIDA = { bien: 'Comió bien', regular: 'Comió regular', nada: 'No comió' }
const ETIQUETA_SIESTA = { bien: 'Durmió bien', poco: 'Durmió poco', nada: 'No durmió' }
const EMOJI_ANIMO = { contento: '😊', tranquilo: '😌', inquieto: '😕', triste: '😢' }
const ETIQUETA_ANIMO = { contento: 'Feliz', tranquilo: 'Tranquilo', inquieto: 'Inquieto', triste: 'Triste' }

const AREAS = ['motricidad', 'lenguaje', 'socializacion', 'creatividad', 'autonomia']
const ETIQUETA_AREA = {
  motricidad: '🏃 Motricidad',
  lenguaje: '🗣️ Lenguaje',
  socializacion: '🤝 Socialización',
  creatividad: '🎨 Creatividad',
  autonomia: '🧑 Autonomía',
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default async function MiHijoPage({ searchParams }) {
  const { nino: ninoIdElegido } = await searchParams
  const supabase = await createClient()

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, avatar_id, aula, fecha_nacimiento')
    .order('nombre')

  if (!ninos || ninos.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <p className="text-sm text-muted-foreground">Aún no tienes ningún niño vinculado.</p>
      </main>
    )
  }

  const nino = ninos.find((n) => n.id === ninoIdElegido) ?? ninos[0]
  const avatar = avatares.find((a) => a.id === nino.avatar_id)
  const edad = calcularEdad(nino.fecha_nacimiento)

  const [{ data: registros }, { data: asistencias }, { data: observaciones }] = await Promise.all([
    supabase
      .from('registros_diarios')
      .select('*')
      .eq('nino_id', nino.id)
      .order('fecha', { ascending: false })
      .limit(21),
    supabase
      .from('asistencia')
      .select('*')
      .eq('nino_id', nino.id)
      .order('fecha', { ascending: false })
      .limit(21),
    supabase
      .from('observaciones_desarrollo')
      .select('id, area, fecha, texto')
      .eq('nino_id', nino.id)
      .order('fecha'),
  ])

  const observacionesPorArea = AREAS.map((area) => ({
    area,
    items: (observaciones ?? []).filter((o) => o.area === area),
  })).filter((a) => a.items.length > 0)

  const asistenciaPorFecha = new Map((asistencias ?? []).map((a) => [a.fecha, a]))

  const fotosPorFecha = new Map(
    await Promise.all(
      (registros ?? [])
        .filter((r) => r.foto_url)
        .map(async (r) => [r.fecha, await urlFirmadaFoto(supabase, r.foto_url)])
    )
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="flex flex-col items-center text-center">
        {avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar.archivo} alt="" width={72} height={72} />
        )}
        <h1 className="mt-2 text-xl font-semibold">
          {nino.nombre} {nino.apellido_inicial}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {[edad, nino.aula].filter(Boolean).join(' · ')}
        </p>
      </div>

      {ninos.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {ninos.map((n) => (
            <a
              key={n.id}
              href={`/mi-diario/hijo?nino=${n.id}`}
              className={`rounded-full px-3 py-1 text-sm ${
                n.id === nino.id ? 'bg-primary-soft text-primary' : 'text-muted-foreground'
              }`}
            >
              {n.nombre}
            </a>
          ))}
        </div>
      )}

      {observacionesPorArea.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">📈 Desarrollo</h2>
          <div className="mt-2 space-y-4">
            {observacionesPorArea.map(({ area, items }) => (
              <div key={area}>
                <p className="mb-1.5 text-sm font-medium">{ETIQUETA_AREA[area]}</p>
                <ol className="space-y-1.5 border-l-2 border-border pl-4">
                  {items.map((o) => (
                    <li key={o.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-sm">{o.texto}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">Historial</h2>
      {!registros || registros.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aún no hay registros.</p>
      ) : (
        <ol className="mt-3 space-y-4 border-l-2 border-border pl-4">
          {registros.map((r) => {
            const asistencia = asistenciaPorFecha.get(r.fecha)
            return (
              <li key={r.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-primary" />
                <p className="text-sm font-medium capitalize text-muted-foreground">
                  {formatearFecha(r.fecha)}
                </p>
                <Card className="mt-1.5 space-y-2">
                  {asistencia?.hora_entrada && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
                        🚪
                      </span>
                      <span>
                        Entrada {asistencia.hora_entrada.slice(0, 5)}
                        {asistencia.quien_entrega && ` · ${asistencia.quien_entrega}`}
                      </span>
                    </div>
                  )}
                  {r.accidente && (
                    <div className="flex items-center gap-2 rounded-2xl bg-danger/10 p-2 text-sm text-danger">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/20">
                        🩹
                      </span>
                      <span>{r.accidente_descripcion}</span>
                    </div>
                  )}
                  {r.comida && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-alimentacion-soft">
                        🍽️
                      </span>
                      <span>{ETIQUETA_COMIDA[r.comida]}</span>
                    </div>
                  )}
                  {r.actividad && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-actividades-soft">
                        🎨
                      </span>
                      <span>{r.actividad}</span>
                    </div>
                  )}
                  {r.siesta && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-descanso-soft">
                        🌙
                      </span>
                      <span>{ETIQUETA_SIESTA[r.siesta]}</span>
                    </div>
                  )}
                  {r.panal_bano && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        🧷
                      </span>
                      <span>{r.panal_bano}</span>
                    </div>
                  )}
                  {r.estado_animo && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-animo-soft">
                        {EMOJI_ANIMO[r.estado_animo]}
                      </span>
                      <span>{ETIQUETA_ANIMO[r.estado_animo]}</span>
                    </div>
                  )}
                  {asistencia?.hora_salida && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
                        🚶
                      </span>
                      <span>
                        Salida {asistencia.hora_salida.slice(0, 5)}
                        {asistencia.quien_recoge && ` · ${asistencia.quien_recoge}`}
                      </span>
                    </div>
                  )}
                  {fotosPorFecha.get(r.fecha) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotosPorFecha.get(r.fecha)}
                      alt={`Foto de ${nino.nombre}`}
                      className="mt-1 w-full rounded-2xl"
                    />
                  )}
                </Card>
              </li>
            )
          })}
        </ol>
      )}
    </main>
  )
}
