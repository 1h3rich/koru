import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cerrarSesion } from '@/app/acciones'
import { Button, Field, Input, Mensaje } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { actualizarNombreEducador } from './actions'

export default async function MasPage({ searchParams }) {
  const { guardado } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('nombre_educador')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 pb-28">
        <h1 className="text-xl font-semibold">Más</h1>

        <ul className="mt-6 space-y-2">
          <li>
            <Link
              href="/panel/ninos/nuevo"
              className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
            >
              ➕ Dar de alta un niño
            </Link>
          </li>
          <li>
            <Link
              href="/panel/avisos"
              className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
            >
              📢 Avisos de aula
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
        </ul>

        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">👩‍🏫 Tu nombre</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Si sois varias educadoras en el mismo centro, esto ayuda a que cada familia sepa
            quién es la persona responsable de su hijo o hija.
          </p>
          {guardado && (
            <div className="mt-2">
              <Mensaje tipo="exito">Guardado.</Mensaje>
            </div>
          )}
          <form action={actualizarNombreEducador} className="mt-3 flex gap-2">
            <Field label="Nombre">
              <Input
                name="nombre_educador"
                defaultValue={cuenta?.nombre_educador ?? ''}
                placeholder="Ej: Marta"
              />
            </Field>
            <Button type="submit" variant="secondary" className="mt-6 h-11">
              Guardar
            </Button>
          </form>
        </div>

        <form action={cerrarSesion} className="mt-8">
          <Button variant="secondary" type="submit" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
