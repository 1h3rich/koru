import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cerrarSesion } from '@/app/acciones'
import { Button, Field, Input, Mensaje } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { SelectorTema } from '@/components/SelectorTema'
import { actualizarNombreEducador, actualizarColorAcento } from './actions'

const MENSAJES_ERROR = {
  edad_invalida: 'Escribe una edad válida (entre 16 y 100).',
}

const COLORES_ACENTO = [
  { valor: 'morado', etiqueta: 'Morado', muestra: '#8b7cf6' },
  { valor: 'azul', etiqueta: 'Azul', muestra: '#4f8fe0' },
  { valor: 'verde', etiqueta: 'Verde', muestra: '#35a878' },
  { valor: 'naranja', etiqueta: 'Naranja', muestra: '#d98a1f' },
]

export default async function MasPage({ searchParams }) {
  const { guardado, error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('nombre_educador, edad, color_acento')
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
              href="/panel/personal"
              className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
            >
              👥 Personal
            </Link>
          </li>
          <li>
            <Link
              href="/panel/informes"
              className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
            >
              📊 Informes
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
          <h2 className="text-sm font-medium text-muted-foreground">👩‍🏫 Tu nombre y edad</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Si sois varias educadoras en el mismo centro, esto ayuda a que cada familia sepa
            quién es la persona responsable de su hijo o hija.
          </p>
          {guardado && (
            <div className="mt-2">
              <Mensaje tipo="exito">Guardado.</Mensaje>
            </div>
          )}
          {error && (
            <div className="mt-2">
              <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
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
            <div className="w-24">
              <Field label="Edad">
                <Input type="number" name="edad" min={16} max={100} defaultValue={cuenta?.edad ?? ''} />
              </Field>
            </div>
            <Button type="submit" variant="secondary" className="mt-6 h-11">
              Guardar
            </Button>
          </form>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">🎨 Color de la app</h2>
          <div className="mt-3 flex gap-3">
            {COLORES_ACENTO.map((c) => (
              <form key={c.valor} action={actualizarColorAcento}>
                <input type="hidden" name="color_acento" value={c.valor} />
                <button
                  type="submit"
                  aria-label={c.etiqueta}
                  aria-pressed={cuenta?.color_acento === c.valor}
                  className={`h-10 w-10 rounded-full border-2 transition-transform active:scale-90 ${
                    (cuenta?.color_acento ?? 'morado') === c.valor
                      ? 'border-foreground'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.muestra }}
                />
              </form>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">🌗 Tema</h2>
          <SelectorTema destino="/panel/mas" />
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
