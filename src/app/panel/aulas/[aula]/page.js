import { createClient } from '@/lib/supabase/server'
import { avatares } from '@/lib/avatares'
import { BotonEnlace, Button, Cabecera } from '@/components/ui'
import { SelectorPastilla as OpcionPill } from '@/components/SelectorPastilla'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { pasarListaAula, aplicarColectivoAula, marcarAusencia } from './actions'

const ETIQUETA_ESTADO = { ausente_justificado: '📋 Ausencia justificada', vacaciones: '🏖️ Vacaciones' }

const CAMPOS = [
  { campo: 'comida', titulo: '🍽 Alimentación', color: 'alimentacion', opciones: [['bien', 'Bien'], ['regular', 'Regular'], ['nada', 'Nada']] },
  { campo: 'siesta', titulo: '🌙 Descanso', color: 'descanso', opciones: [['bien', 'Bien'], ['poco', 'Poco'], ['nada', 'Nada']] },
  {
    campo: 'estado_animo',
    titulo: '😊 Estado de ánimo',
    color: 'animo',
    opciones: [['contento', '😊 Contento'], ['tranquilo', '😌 Tranquilo'], ['inquieto', '😕 Inquieto'], ['triste', '😢 Triste']],
  },
]

export default async function VistaAulaPage({ params }) {
  const { aula: aulaCodificada } = await params
  const aula = decodeURIComponent(aulaCodificada)

  const supabase = await createClient()
  const fecha = new Date().toISOString().slice(0, 10)

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, avatar_id')
    .eq('aula', aula)
    .eq('activo', true)
    .order('nombre')

  const ninoIds = (ninos ?? []).map((n) => n.id)

  const [{ data: alergias }, { data: asistencias }, { data: registros }] = await Promise.all([
    ninoIds.length > 0
      ? supabase.from('alergias').select('nino_id, alergeno').in('nino_id', ninoIds)
      : { data: [] },
    ninoIds.length > 0
      ? supabase
          .from('asistencia')
          .select('nino_id, hora_entrada, estado, motivo')
          .eq('fecha', fecha)
          .in('nino_id', ninoIds)
      : { data: [] },
    ninoIds.length > 0
      ? supabase
          .from('registros_diarios')
          .select('nino_id, comida, siesta, estado_animo')
          .eq('fecha', fecha)
          .in('nino_id', ninoIds)
      : { data: [] },
  ])

  const alergiasPorNino = new Map()
  for (const a of alergias ?? []) {
    if (!alergiasPorNino.has(a.nino_id)) alergiasPorNino.set(a.nino_id, [])
    alergiasPorNino.get(a.nino_id).push(a.alergeno)
  }
  const asistenciaPorNino = new Map((asistencias ?? []).map((a) => [a.nino_id, a]))
  const registroPorNino = new Map((registros ?? []).map((r) => [r.nino_id, r]))

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <Cabecera
          volver="/panel"
          titulo={aula}
          accion={<BotonEnlace href={`/panel/aulas/${encodeURIComponent(aula)}/mensajes`}>💬 Chat</BotonEnlace>}
        />

        {(!ninos || ninos.length === 0) ? (
          <p className="mt-6 text-sm text-muted-foreground">No hay niños activos en esta aula.</p>
        ) : (
          <>
            <form action={pasarListaAula} className="mb-6">
              <input type="hidden" name="aula" value={aula} />
              <Button type="submit" className="w-full">
                🚪 Pasar lista (marcar entrada de todos ahora)
              </Button>
            </form>

            <h2 className="text-sm font-medium text-muted-foreground">Niños del aula</h2>
            <ul className="mt-2 space-y-2">
              {ninos.map((nino) => {
                const avatar = avatares.find((a) => a.id === nino.avatar_id)
                const alergiasNino = alergiasPorNino.get(nino.id)
                const asistencia = asistenciaPorNino.get(nino.id)
                return (
                  <li
                    key={nino.id}
                    className="flex items-center gap-3 rounded-2xl border border-border px-4 py-2.5"
                  >
                    {avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar.archivo} alt="" width={32} height={32} />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {nino.nombre} {nino.apellido_inicial}.
                        {asistencia?.hora_entrada ? ' ✅' : ''}
                      </p>
                      {alergiasNino && alergiasNino.length > 0 && (
                        <p className="text-xs text-danger">🚨 {alergiasNino.join(', ')}</p>
                      )}
                      {!asistencia?.hora_entrada && asistencia?.estado !== 'presente' && (
                        <p className="text-xs text-muted-foreground">
                          {ETIQUETA_ESTADO[asistencia?.estado]}
                          {asistencia?.motivo && ` — ${asistencia.motivo}`}
                        </p>
                      )}
                    </div>
                    {!asistencia?.hora_entrada && (!asistencia?.estado || asistencia.estado === 'presente') && (
                      <div className="flex gap-1">
                        <form action={marcarAusencia}>
                          <input type="hidden" name="aula" value={aula} />
                          <input type="hidden" name="nino_id" value={nino.id} />
                          <input type="hidden" name="estado" value="ausente_justificado" />
                          <Button type="submit" variant="ghost" className="text-xs">
                            Ausente
                          </Button>
                        </form>
                        <form action={marcarAusencia}>
                          <input type="hidden" name="aula" value={aula} />
                          <input type="hidden" name="nino_id" value={nino.id} />
                          <input type="hidden" name="estado" value="vacaciones" />
                          <Button type="submit" variant="ghost" className="text-xs">
                            Vacaciones
                          </Button>
                        </form>
                      </div>
                    )}
                    <BotonEnlace href={`/panel/ninos/${nino.id}/hoy`} variant="secondary">
                      Hoy
                    </BotonEnlace>
                  </li>
                )
              })}
            </ul>

            {CAMPOS.map(({ campo, titulo, color, opciones }) => (
              <form
                key={campo}
                action={aplicarColectivoAula}
                className="mt-8 space-y-3 rounded-2xl border border-border p-4"
              >
                <input type="hidden" name="aula" value={aula} />
                <input type="hidden" name="campo" value={campo} />
                <h2 className="text-sm font-medium text-muted-foreground">{titulo} — para todos</h2>

                <div className="flex flex-wrap gap-2">
                  {ninos.map((nino) => (
                    <label key={nino.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        name="nino_id"
                        value={nino.id}
                        defaultChecked
                        className="h-4 w-4 rounded border-border"
                      />
                      {nino.nombre}
                    </label>
                  ))}
                </div>

                <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
                  {opciones.map(([valor, etiqueta]) => (
                    <OpcionPill key={valor} nombre="valor" valor={valor} etiqueta={etiqueta} color={color} />
                  ))}
                </div>

                <Button type="submit" variant="secondary" className="w-full">
                  Aplicar a los marcados
                </Button>
              </form>
            ))}

            <p className="mt-6 text-xs text-muted-foreground">
              🧷 El pañal y 🌡️ la temperatura no se rellenan aquí — son datos individuales, entra en
              &quot;Hoy&quot; de cada niño.
            </p>
          </>
        )}
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
