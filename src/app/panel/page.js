import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { avatares } from '@/lib/avatares'
import { calcularEdad } from '@/lib/edad'
import { BotonEnlace, Card } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'

// Panel de la cuidadora/guardería (paso 5 del plan): confirma la
// cuenta, lista sus niños con acceso directo al registro de hoy, y
// enlaza al alta de niños, la gestión de accesos y el horario
// semanal.
export default async function PanelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('nombre_negocio, tipo')
    .eq('id', user.id)
    .single()

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, avatar_id, aula, activo, fecha_nacimiento')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="relative mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <div>
          <h1 className="text-2xl font-semibold">{cuenta?.nombre_negocio}</h1>
          <p className="text-sm text-muted-foreground">
            {cuenta?.tipo === 'guarderia' ? 'Guardería' : 'Cuidadora individual'}
          </p>
        </div>

        {[...new Set((ninos ?? []).map((n) => n.aula).filter(Boolean))].sort().length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-medium text-muted-foreground">Aulas</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...new Set((ninos ?? []).map((n) => n.aula).filter(Boolean))]
                .sort()
                .map((aula) => (
                  <Link
                    key={aula}
                    href={`/panel/aulas/${encodeURIComponent(aula)}`}
                    className="sombra-suave rounded-full border border-border bg-background px-4 py-2 text-sm font-medium"
                  >
                    🏫 {aula}
                  </Link>
                ))}
            </div>
          </>
        )}

        <h2 className="mt-8 text-sm font-medium text-muted-foreground">Niños</h2>
        {!ninos || ninos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Todavía no has dado de alta a ningún niño.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {ninos.map((nino) => {
              const avatar = avatares.find((a) => a.id === nino.avatar_id)
              const edad = calcularEdad(nino.fecha_nacimiento)
              return (
                <li key={nino.id}>
                  <Card className="flex items-center gap-3">
                    {avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar.archivo} alt="" width={40} height={40} />
                    )}
                    <Link href={`/panel/ninos/${nino.id}`} className="flex-1">
                      <p className="font-medium">
                        {nino.nombre} {nino.apellido_inicial}.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[edad, nino.aula].filter(Boolean).join(' · ')}
                      </p>
                    </Link>
                    <BotonEnlace href={`/panel/ninos/${nino.id}/hoy`} variant="primary">
                      Hoy
                    </BotonEnlace>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}

        <Link
          href="/panel/ninos/nuevo"
          aria-label="Dar de alta un niño"
          className="sombra-suave fixed right-6 bottom-24 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground transition-transform active:scale-90 md:absolute md:right-0 md:bottom-auto md:top-0"
        >
          ➕
        </Link>
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
