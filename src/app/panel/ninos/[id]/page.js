import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { avatares } from '@/lib/avatares'
import { calcularEdad } from '@/lib/edad'
import {
  vincularPadre,
  desvincularPadre,
  anadirObjeto,
  borrarObjeto,
  crearIncidencia,
  borrarIncidencia,
  subirDocumentoCuidadora,
  borrarDocumentoNinoCuidadora,
} from './actions'
import { urlFirmadaDocumento } from '@/lib/documentos'
import { BotonEnlace, Button, Cabecera, Input, Mensaje } from '@/components/ui'
import { Confeti } from '@/components/Confeti'

const MENSAJES_ERROR = {
  datos_invalidos: 'Escribe un email.',
  no_se_pudo_invitar: 'No hemos podido invitar a ese email. Inténtalo de nuevo.',
  ya_vinculado: 'Ese padre ya tiene acceso a este niño.',
  no_se_pudo_vincular: 'Ha habido un problema al vincular el acceso. Inténtalo de nuevo.',
}

export default async function DetalleNinoPage({ params, searchParams }) {
  const { id } = await params
  const { error, guardado, creado } = await searchParams

  const supabase = await createClient()
  const { data: nino } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, avatar_id, aula, activo, fecha_nacimiento')
    .eq('id', id)
    .maybeSingle()

  if (!nino) {
    notFound()
  }

  const { data: vinculos } = await supabase
    .from('nino_padre')
    .select('padre_id, telefono_emergencia')
    .eq('nino_id', id)

  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() - 30)
  const hace30Dias = fechaLimite.toISOString().slice(0, 10)

  const [
    { data: objetos },
    { data: alergias },
    { data: personasAutorizadas },
    { data: documentos },
    { data: incidencias },
    { data: asistenciaReciente },
  ] = await Promise.all([
    supabase.from('objetos_personales').select('id, objeto').eq('nino_id', id).order('created_at'),
    supabase.from('alergias').select('id, alergeno, notas').eq('nino_id', id).order('created_at'),
    supabase
      .from('personas_autorizadas')
      .select('id, nombre, dni, telefono, parentesco')
      .eq('nino_id', id)
      .order('created_at'),
    supabase.from('documentos_nino').select('id, nombre, ruta').eq('nino_id', id).order('created_at'),
    supabase.from('incidencias').select('id, fecha, descripcion').eq('nino_id', id).order('fecha', { ascending: false }),
    supabase.from('asistencia').select('estado, hora_entrada').eq('nino_id', id).gte('fecha', hace30Dias),
  ])

  const estadisticasAsistencia = (asistenciaReciente ?? []).reduce(
    (acc, a) => {
      if (a.hora_entrada) acc.presente += 1
      else if (a.estado === 'vacaciones') acc.vacaciones += 1
      else if (a.estado === 'ausente_justificado') acc.ausente += 1
      return acc
    },
    { presente: 0, ausente: 0, vacaciones: 0 }
  )

  const documentosConUrl = await Promise.all(
    (documentos ?? []).map(async (d) => ({ ...d, url: await urlFirmadaDocumento(supabase, d.ruta) }))
  )

  const admin = createAdminClient()
  const padres = await Promise.all(
    (vinculos ?? []).map(async ({ padre_id, telefono_emergencia }) => {
      const { data } = await admin.auth.admin.getUserById(padre_id)
      return {
        id: padre_id,
        email: data?.user?.email ?? '(email no disponible)',
        telefono_emergencia,
      }
    })
  )

  const avatar = avatares.find((a) => a.id === nino.avatar_id)
  const edad = calcularEdad(nino.fecha_nacimiento)

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      {(guardado || creado) && <Confeti />}
      <Cabecera
        volver="/panel"
        titulo={
          <span className="flex items-center gap-2">
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.archivo} alt="" width={32} height={32} />
            )}
            {nino.nombre} {nino.apellido_inicial}.
          </span>
        }
        subtitulo={[edad, nino.aula].filter(Boolean).join(' · ') || undefined}
        accion={<BotonEnlace href={`/panel/ninos/${nino.id}/hoy`}>Registrar hoy</BotonEnlace>}
      />

      <div className="mb-6 flex gap-2">
        <BotonEnlace href={`/panel/ninos/${nino.id}/mensajes`} variant="secondary">
          💬 Mensajes
        </BotonEnlace>
        <BotonEnlace href={`/panel/ninos/${nino.id}/desarrollo`} variant="secondary">
          📈 Desarrollo
        </BotonEnlace>
      </div>

      {guardado && (
        <div className="mb-6">
          <Mensaje tipo="exito">¡Registro de hoy guardado! 🎉</Mensaje>
        </div>
      )}

      {creado && (
        <div className="mb-6">
          <Mensaje tipo="exito">¡{nino.nombre} dado de alta y padre/madre invitado! 🎉</Mensaje>
        </div>
      )}

      {padres.some((p) => p.telefono_emergencia) && (
        <div className="mb-6 rounded-2xl border border-danger bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">📞 Contacto rápido en caso de emergencia</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {padres
              .filter((p) => p.telefono_emergencia)
              .map((p) => (
                <li key={p.id}>
                  {p.telefono_emergencia}{' '}
                  <span className="text-muted-foreground">({p.email})</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {alergias && alergias.length > 0 && (
        <div className="mb-6 rounded-2xl border border-danger bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">🚨 Alergias</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {alergias.map((a) => (
              <li key={a.id}>
                {a.alergeno}
                {a.notas && <span className="text-muted-foreground"> — {a.notas}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {personasAutorizadas && personasAutorizadas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground">🪪 Personas autorizadas a recoger</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {personasAutorizadas.map((p) => (
              <li key={p.id}>
                {p.nombre}
                {p.parentesco && <span className="text-muted-foreground"> ({p.parentesco})</span>}
                {p.telefono && <span className="text-muted-foreground"> · {p.telefono}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(estadisticasAsistencia.presente > 0 || estadisticasAsistencia.ausente > 0 || estadisticasAsistencia.vacaciones > 0) && (
        <div className="mb-6 rounded-2xl border border-border p-4">
          <p className="text-sm font-medium text-muted-foreground">📊 Asistencia (últimos 30 días)</p>
          <div className="mt-2 flex gap-4 text-sm">
            <span>✅ {estadisticasAsistencia.presente} días</span>
            <span>📋 {estadisticasAsistencia.ausente} ausencias</span>
            <span>🏖️ {estadisticasAsistencia.vacaciones} vacaciones</span>
          </div>
        </div>
      )}

      <h2 className="text-sm font-medium text-muted-foreground">🎒 Qué debe traer cada día</h2>
      {objetos && objetos.length > 0 && (
        <ul className="mt-2 space-y-2">
          {objetos.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5"
            >
              <span>{o.objeto}</span>
              <form action={borrarObjeto}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="nino_id" value={nino.id} />
                <Button type="submit" variant="ghost">
                  Quitar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={anadirObjeto} className="mt-2 flex gap-2">
        <input type="hidden" name="nino_id" value={nino.id} />
        <Input name="objeto" placeholder="Ej: Pañales" />
        <Button type="submit">Añadir</Button>
      </form>

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">📄 Documentos</h2>
      {documentosConUrl.length > 0 && (
        <ul className="mt-2 space-y-2">
          {documentosConUrl.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5"
            >
              {d.url ? (
                <a href={d.url} target="_blank" rel="noreferrer" className="truncate text-primary underline">
                  {d.nombre}
                </a>
              ) : (
                <span className="truncate">{d.nombre}</span>
              )}
              <form action={borrarDocumentoNinoCuidadora}>
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
      <form action={subirDocumentoCuidadora} className="mt-2 flex gap-2">
        <input type="hidden" name="nino_id" value={nino.id} />
        <Input type="file" name="archivo" required className="flex-1" />
        <Button type="submit">Subir</Button>
      </form>

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">🩹 Incidencias</h2>
      {incidencias && incidencias.length > 0 && (
        <ul className="mt-2 space-y-2">
          {incidencias.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5"
            >
              <div>
                <p className="text-xs text-muted-foreground">
                  {new Date(i.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </p>
                <p className="text-sm">{i.descripcion}</p>
              </div>
              <form action={borrarIncidencia}>
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="nino_id" value={nino.id} />
                <Button type="submit" variant="ghost">
                  Quitar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={crearIncidencia} className="mt-2 flex gap-2">
        <input type="hidden" name="nino_id" value={nino.id} />
        <Input name="descripcion" required placeholder="Describe lo ocurrido" />
        <Button type="submit">Añadir</Button>
      </form>

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">Padres con acceso</h2>
      {padres.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Todavía no has dado acceso a ningún padre.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {padres.map((padre) => (
            <li
              key={padre.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5"
            >
              <span>{padre.email}</span>
              <form action={desvincularPadre}>
                <input type="hidden" name="nino_id" value={nino.id} />
                <input type="hidden" name="padre_id" value={padre.id} />
                <Button type="submit" variant="ghost">
                  Quitar acceso
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">Dar acceso a un padre</h2>
      <form action={vincularPadre} className="mt-2 flex gap-2">
        <input type="hidden" name="nino_id" value={nino.id} />
        <Input type="email" name="email" required placeholder="email del padre o madre" />
        <Button type="submit">Invitar</Button>
      </form>
      <div className="mt-2">
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </div>
    </main>
  )
}
