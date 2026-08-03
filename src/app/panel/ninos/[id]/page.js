import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { avatares } from '@/lib/avatares'
import { calcularEdad } from '@/lib/edad'
import { vincularPadre, desvincularPadre } from './actions'
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
  const { error, guardado } = await searchParams

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
      {guardado && <Confeti />}
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

      <h2 className="text-sm font-medium text-muted-foreground">Padres con acceso</h2>
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
