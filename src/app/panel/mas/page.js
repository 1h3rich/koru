import Link from 'next/link'
import { cerrarSesion } from '@/app/acciones'
import { Button } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'

export default function MasPage() {
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

        <form action={cerrarSesion} className="mt-6">
          <Button variant="secondary" type="submit" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
