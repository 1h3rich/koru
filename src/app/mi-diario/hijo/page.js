import { createClient } from '@/lib/supabase/server'
import { avatares } from '@/lib/avatares'
import { calcularEdad } from '@/lib/edad'
import { urlFirmadaFoto } from '@/lib/fotos'
import { urlFirmadaDocumento } from '@/lib/documentos'
import { Button, Card, Field, Input } from '@/components/ui'
import {
  crearAlergia,
  borrarAlergia,
  crearPersonaAutorizada,
  borrarPersonaAutorizada,
  subirDocumentoPadre,
  borrarDocumentoNino,
} from './actions'

const ETIQUETA_COMIDA = { bien: 'Comió bien', regular: 'Comió regular', nada: 'No comió' }
const ETIQUETA_CANTIDAD = { todo: 'todo', mitad: 'la mitad', poco: 'poco', nada: 'nada' }
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

  const { data: hitos } = await supabase
    .from('hitos_dia')
    .select('id, fecha, hora, descripcion')
    .eq('nino_id', nino.id)
    .order('fecha', { ascending: false })
    .order('hora')
  const hitosPorFecha = new Map()
  for (const h of hitos ?? []) {
    if (!hitosPorFecha.has(h.fecha)) hitosPorFecha.set(h.fecha, [])
    hitosPorFecha.get(h.fecha).push(h)
  }

  const observacionesPorArea = AREAS.map((area) => ({
    area,
    items: (observaciones ?? []).filter((o) => o.area === area),
  })).filter((a) => a.items.length > 0)

  const [
    { data: objetos },
    { data: alergias },
    { data: personasAutorizadas },
    { data: documentos },
    { data: incidencias },
  ] = await Promise.all([
    supabase.from('objetos_personales').select('id, objeto').eq('nino_id', nino.id).order('created_at'),
    supabase.from('alergias').select('id, alergeno, notas').eq('nino_id', nino.id).order('created_at'),
    supabase
      .from('personas_autorizadas')
      .select('id, nombre, dni, telefono, parentesco')
      .eq('nino_id', nino.id)
      .order('created_at'),
    supabase.from('documentos_nino').select('id, nombre, ruta').eq('nino_id', nino.id).order('created_at'),
    supabase
      .from('incidencias')
      .select('id, fecha, descripcion')
      .eq('nino_id', nino.id)
      .order('fecha', { ascending: false }),
  ])

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d) => ({ ...d, url: await urlFirmadaDocumento(supabase, d.ruta) }))
  )

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

      {objetos && objetos.length > 0 && (
        <Card className="mt-6">
          <p className="text-sm font-medium text-muted-foreground">🎒 Qué debe traer cada día</p>
          <ul className="mt-2 space-y-1 text-sm">
            {objetos.map((o) => (
              <li key={o.id}>• {o.objeto}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">🚨 Alergias</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          La cuidadora las ve para tenerlas en cuenta cada día.
        </p>
        {alergias && alergias.length > 0 && (
          <ul className="mt-2 space-y-2">
            {alergias.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm"
              >
                <span>
                  {a.alergeno}
                  {a.notas && <span className="text-muted-foreground"> — {a.notas}</span>}
                </span>
                <form action={borrarAlergia}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="nino_id" value={nino.id} />
                  <Button type="submit" variant="ghost">
                    Quitar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={crearAlergia} className="mt-2 flex gap-2">
          <input type="hidden" name="nino_id" value={nino.id} />
          <Input name="alergeno" required placeholder="Ej: Frutos secos" className="flex-1" />
          <Input name="notas" placeholder="Notas (opcional)" className="flex-1" />
          <Button type="submit">Añadir</Button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">🪪 Personas autorizadas a recoger</h2>
        {personasAutorizadas && personasAutorizadas.length > 0 && (
          <ul className="mt-2 space-y-2">
            {personasAutorizadas.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5 text-sm"
              >
                <span>
                  {p.nombre}
                  {p.parentesco && <span className="text-muted-foreground"> ({p.parentesco})</span>}
                  {p.telefono && <span className="text-muted-foreground"> · {p.telefono}</span>}
                </span>
                <form action={borrarPersonaAutorizada}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="nino_id" value={nino.id} />
                  <Button type="submit" variant="ghost">
                    Quitar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={crearPersonaAutorizada} className="mt-2 space-y-2 rounded-2xl border border-border p-3">
          <input type="hidden" name="nino_id" value={nino.id} />
          <div className="flex gap-2">
            <Input name="nombre" required placeholder="Nombre" className="flex-1" />
            <Input name="parentesco" placeholder="Parentesco" className="flex-1" />
          </div>
          <div className="flex gap-2">
            <Input name="dni" placeholder="DNI (opcional)" className="flex-1" />
            <Input name="telefono" placeholder="Teléfono (opcional)" className="flex-1" />
          </div>
          <Button type="submit" className="w-full">
            Añadir
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">📄 Documentos</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">DNI, autorizaciones... visibles para ambos.</p>
        {documentosConUrl.length > 0 && (
          <ul className="mt-2 space-y-2">
            {documentosConUrl.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5 text-sm"
              >
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="truncate text-primary underline">
                    {d.nombre}
                  </a>
                ) : (
                  <span className="truncate">{d.nombre}</span>
                )}
                <form action={borrarDocumentoNino}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="ruta" value={d.ruta} />
                  <input type="hidden" name="nino_id" value={nino.id} />
                  <Button type="submit" variant="ghost">
                    Quitar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={subirDocumentoPadre} className="mt-2 flex gap-2">
          <input type="hidden" name="nino_id" value={nino.id} />
          <Input type="file" name="archivo" required className="flex-1" />
          <Button type="submit">Subir</Button>
        </form>
      </div>

      {incidencias && incidencias.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">🩹 Incidencias</h2>
          <ul className="mt-2 space-y-2">
            {incidencias.map((i) => (
              <li key={i.id} className="rounded-2xl border border-border px-4 py-2.5 text-sm">
                <p className="text-xs text-muted-foreground">
                  {new Date(i.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </p>
                <p>{i.descripcion}</p>
              </li>
            ))}
          </ul>
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
                  {hitosPorFecha.get(r.fecha)?.length > 0 && (
                    <div className="rounded-2xl bg-muted p-2">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        🕐 Línea temporal
                      </p>
                      <ul className="space-y-0.5 text-sm">
                        {hitosPorFecha.get(r.fecha).map((h) => (
                          <li key={h.id}>
                            <span className="font-medium">{h.hora.slice(0, 5)}</span> — {h.descripcion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.comida && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-alimentacion-soft">
                        🍽️
                      </span>
                      <span>
                        {ETIQUETA_COMIDA[r.comida]}
                        {r.cantidad_comida && ` · ${ETIQUETA_CANTIDAD[r.cantidad_comida]}`}
                      </span>
                    </div>
                  )}
                  {r.temperatura && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/10">
                        🌡️
                      </span>
                      <span>{r.temperatura}°C</span>
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
                  {r.panal_cambiado && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        🧷
                      </span>
                      <span>{r.panal_bano || 'Pañal cambiado'}</span>
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
