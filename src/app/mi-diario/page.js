import { createClient } from '@/lib/supabase/server'
import { avatares } from '@/lib/avatares'
import { calcularEdad } from '@/lib/edad'
import { urlFirmadaFoto } from '@/lib/fotos'
import { Card, Button } from '@/components/ui'
import { confirmarAviso } from './acciones'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function nombrePorEmail(email) {
  const local = email?.split('@')[0] ?? ''
  const primero = local.split(/[.\-_0-9]/)[0]
  if (!primero) return null
  return primero.charAt(0).toUpperCase() + primero.slice(1)
}

export default async function InicioPadrePage({ searchParams }) {
  const { nino: ninoIdElegido } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, avatar_id, aula, cuenta_id, fecha_nacimiento')
    .order('nombre')

  if (!ninos || ninos.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <p className="text-sm text-muted-foreground">
          Aún no tienes ningún niño vinculado. Cuando tu guardería o cuidadora te dé acceso,
          aparecerá aquí.
        </p>
      </main>
    )
  }

  const nino = ninos.find((n) => n.id === ninoIdElegido) ?? ninos[0]
  const avatar = avatares.find((a) => a.id === nino.avatar_id)
  const edad = calcularEdad(nino.fecha_nacimiento)
  const nombreSaludo = nombrePorEmail(user.email)

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('nombre_negocio, nombre_educador')
    .eq('id', nino.cuenta_id)
    .maybeSingle()

  const hoy = new Date()
  const fecha = hoy.toISOString().slice(0, 10)
  const diaSemana = DIAS_SEMANA[hoy.getDay()]

  const [{ data: registro }, { data: asistencia }, { data: horario }, { data: avisos }, { data: confirmaciones }] = await Promise.all([
    supabase.from('registros_diarios').select('*').eq('nino_id', nino.id).eq('fecha', fecha).maybeSingle(),
    supabase.from('asistencia').select('*').eq('nino_id', nino.id).eq('fecha', fecha).maybeSingle(),
    supabase
      .from('horarios_semanales')
      .select('hora, actividad, dia_semana')
      .eq('cuenta_id', nino.cuenta_id)
      .eq('dia_semana', diaSemana)
      .or(nino.aula ? `aula.eq.${nino.aula},aula.is.null` : 'aula.is.null')
      .order('hora'),
    supabase
      .from('avisos')
      .select('id, titulo, mensaje, requiere_autorizacion, created_at')
      .eq('cuenta_id', nino.cuenta_id)
      .or(nino.aula ? `aula.eq.${nino.aula},aula.is.null` : 'aula.is.null')
      .order('created_at', { ascending: false }),
    supabase.from('avisos_confirmaciones').select('aviso_id').eq('nino_id', nino.id),
  ])

  const { data: hitos } = await supabase
    .from('hitos_dia')
    .select('id, hora, descripcion')
    .eq('nino_id', nino.id)
    .eq('fecha', fecha)
    .order('hora')

  const confirmados = new Set((confirmaciones ?? []).map((c) => c.aviso_id))

  const fotoUrl = registro?.foto_url ? await urlFirmadaFoto(supabase, registro.foto_url) : null
  const fotoDescargaUrl = registro?.foto_url
    ? await urlFirmadaFoto(supabase, registro.foto_url, { descargar: true })
    : null

  const ETIQUETA_COMIDA = { bien: 'Comió bien', regular: 'Comió regular', nada: 'No comió' }
  const ETIQUETA_SIESTA = { bien: 'Durmió bien', poco: 'Durmió poco', nada: 'No durmió' }
  const ETIQUETA_ANIMO = { contento: 'Feliz', tranquilo: 'Tranquilo', inquieto: 'Inquieto', triste: 'Triste' }
  const EMOJI_ANIMO = { contento: '😊', tranquilo: '😌', inquieto: '😕', triste: '😢' }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {cuenta?.nombre_negocio ?? 'Koru'}
            {cuenta?.nombre_educador && ` · ${cuenta.nombre_educador}`}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold">
            {nombreSaludo ? `¡Hola, ${nombreSaludo}! 👋` : '¡Hola! 👋'}
          </h1>
        </div>
      </div>

      {ninos.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {ninos.map((n) => {
            const av = avatares.find((a) => a.id === n.avatar_id)
            return (
              <a
                key={n.id}
                href={`/mi-diario?nino=${n.id}`}
                className={`sombra-suave flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                  n.id === nino.id ? 'border-primary bg-primary-soft text-primary' : 'border-border'
                }`}
              >
                {av && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={av.archivo} alt="" width={22} height={22} />
                )}
                {n.nombre}
              </a>
            )
          })}
        </div>
      )}

      <Card className="mt-4 flex items-center gap-4 bg-primary-soft">
        {avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar.archivo} alt="" width={56} height={56} />
        )}
        <div>
          <p className="text-lg font-semibold">
            {nino.nombre} {nino.apellido_inicial}.
          </p>
          <p className="text-sm text-muted-foreground">
            {[edad, nino.aula].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Card>

      {avisos && avisos.length > 0 && (
        <div className="mt-4 space-y-3">
          {avisos.map((aviso) => {
            const confirmado = confirmados.has(aviso.id)
            return (
              <div key={aviso.id} className="sombra-suave rounded-3xl border border-border bg-actividades-soft p-4">
                <p className="text-sm font-medium text-actividades">📢 {aviso.titulo}</p>
                <p className="mt-1 text-sm text-foreground">{aviso.mensaje}</p>
                {aviso.requiere_autorizacion && (
                  confirmado ? (
                    <p className="mt-2 text-sm font-medium text-primary">✅ Autorización confirmada</p>
                  ) : (
                    <form action={confirmarAviso} className="mt-2">
                      <input type="hidden" name="aviso_id" value={aviso.id} />
                      <input type="hidden" name="nino_id" value={nino.id} />
                      <Button type="submit">Confirmar autorización</Button>
                    </form>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {registro?.accidente && (
        <div className="sombra-suave mt-4 rounded-3xl border border-danger bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">🩹 Incidencia de hoy</p>
          <p className="mt-1 text-sm text-foreground">{registro.accidente_descripcion}</p>
        </div>
      )}

      <h2 className="mt-6 text-sm font-medium text-muted-foreground">Resumen de hoy</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="sombra-suave rounded-3xl border border-border bg-alimentacion-soft p-4">
          <p className="text-2xl">🍽️</p>
          <p className="mt-2 text-sm text-muted-foreground">Alimentación</p>
          <p className="font-medium text-alimentacion">
            {registro?.comida ? ETIQUETA_COMIDA[registro.comida] : 'Sin registrar'}
          </p>
        </div>
        <div className="sombra-suave rounded-3xl border border-border bg-descanso-soft p-4">
          <p className="text-2xl">🌙</p>
          <p className="mt-2 text-sm text-muted-foreground">Descanso</p>
          <p className="font-medium text-descanso">
            {registro?.siesta ? ETIQUETA_SIESTA[registro.siesta] : 'Sin registrar'}
          </p>
        </div>
        <div className="sombra-suave rounded-3xl border border-border bg-actividades-soft p-4">
          <p className="text-2xl">🎨</p>
          <p className="mt-2 text-sm text-muted-foreground">Actividades</p>
          <p className="font-medium text-actividades">{registro?.actividad || 'Sin registrar'}</p>
        </div>
        <div className="sombra-suave rounded-3xl border border-border bg-animo-soft p-4">
          <p className="text-2xl">{registro?.estado_animo ? EMOJI_ANIMO[registro.estado_animo] : '🙂'}</p>
          <p className="mt-2 text-sm text-muted-foreground">Estado de ánimo</p>
          <p className="font-medium text-animo">
            {registro?.estado_animo ? ETIQUETA_ANIMO[registro.estado_animo] : 'Sin registrar'}
          </p>
        </div>
      </div>

      {(asistencia?.hora_entrada || asistencia?.hora_salida) && (
        <Card className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">Asistencia de hoy</p>
          <p className="mt-1 text-sm">
            {asistencia.hora_entrada &&
              `Entrada ${asistencia.hora_entrada.slice(0, 5)}${asistencia.quien_entrega ? ` · ${asistencia.quien_entrega}` : ''}`}
            {asistencia.hora_entrada && asistencia.hora_salida && ' — '}
            {asistencia.hora_salida &&
              `Salida ${asistencia.hora_salida.slice(0, 5)}${asistencia.quien_recoge ? ` · ${asistencia.quien_recoge}` : ''}`}
          </p>
        </Card>
      )}

      {hitos && hitos.length > 0 && (
        <Card className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">🕐 Línea temporal de hoy</p>
          <ol className="mt-2 space-y-1.5 border-l-2 border-border pl-4">
            {hitos.map((h) => (
              <li key={h.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="font-medium">{h.hora.slice(0, 5)}</span> — {h.descripcion}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {registro?.actividad && (
        <div className="sombra-suave mt-4 rounded-3xl border border-border bg-primary-soft p-4">
          <p className="text-sm font-medium text-primary">💜 Notas del día</p>
          <p className="mt-1 text-sm text-foreground">{registro.actividad}</p>
        </div>
      )}

      {fotoUrl && (
        <div className="sombra-suave mt-4 overflow-hidden rounded-3xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoUrl} alt={`Foto de ${nino.nombre} de hoy`} className="w-full" />
          <a
            href={fotoDescargaUrl}
            className="block px-4 py-2.5 text-center text-sm font-medium text-primary"
          >
            ⬇️ Descargar foto
          </a>
        </div>
      )}

      {horario && horario.length > 0 && (
        <Card className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">Próximo en el horario</p>
          <p className="mt-1 text-sm">
            {horario[0].hora.slice(0, 5)} — {horario[0].actividad}
          </p>
        </Card>
      )}
    </main>
  )
}
