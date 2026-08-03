import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cerrarSesion } from '@/app/acciones'
import { Button, Field, Input, Mensaje } from '@/components/ui'
import { guardarTelefonoEmergencia } from './actions'

export default async function MasPage({ searchParams }) {
  const { contacto_guardado } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id, nombre, nino_padre!inner(telefono_emergencia)')
    .eq('nino_padre.padre_id', user.id)
    .order('nombre')

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">Más</h1>

      <ul className="mt-6 space-y-2">
        <li>
          <Link
            href="/mi-diario/horario"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            🗓️ Horario semanal
          </Link>
        </li>
        <li>
          <Link
            href="/acerca-de"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            ℹ️ Acerca de Koru
          </Link>
        </li>
        <li>
          <Link
            href="/creditos"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            Créditos de los iconos
          </Link>
        </li>
        <li className="sombra-suave rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground">
          📷 Galería de fotos — próximamente
        </li>
      </ul>

      {ninos && ninos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">📞 Contacto rápido</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Un teléfono al que la cuidadora pueda llamarte directamente en una emergencia, sin
            tener que buscarlo. Es opcional y puedes borrarlo cuando quieras.
          </p>
          {contacto_guardado && (
            <div className="mt-2">
              <Mensaje tipo="exito">Guardado.</Mensaje>
            </div>
          )}
          <div className="mt-3 space-y-3">
            {ninos.map((nino) => (
              <form
                key={nino.id}
                action={guardarTelefonoEmergencia}
                className="flex items-end gap-2 rounded-2xl border border-border p-3"
              >
                <input type="hidden" name="nino_id" value={nino.id} />
                <Field label={`Para ${nino.nombre}`}>
                  <Input
                    type="tel"
                    name="telefono_emergencia"
                    defaultValue={nino.nino_padre[0]?.telefono_emergencia ?? ''}
                    placeholder="Ej: 600 000 000"
                  />
                </Field>
                <Button type="submit" variant="secondary">
                  Guardar
                </Button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form action={cerrarSesion} className="mt-6">
        <Button variant="secondary" type="submit" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </main>
  )
}
