import Link from 'next/link'
import { cerrarSesion } from '@/app/acciones'
import { Button } from '@/components/ui'

export default async function BienvenidaPage({ searchParams }) {
  const { rol } = await searchParams

  if (rol === 'padre') {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl">👀</div>
        <h1 className="mt-3 text-xl font-semibold">Todavía no tienes acceso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pide a la guardería o cuidadora de tu peque que te dé acceso desde su panel, usando
          este mismo email. En cuanto lo haga, vuelve a entrar con el enlace de siempre.
        </p>
        <form action={cerrarSesion} className="mt-6">
          <Button variant="ghost" type="submit">
            Volver a entrar con otro email
          </Button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <p className="text-2xl">🌿</p>
        <h1 className="mt-2 text-2xl font-semibold">¿Cómo usas Koru?</h1>
      </div>
      <div className="w-full space-y-3">
        <Link
          href="/registro"
          className="block rounded-2xl border border-border p-5 transition hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
        >
          <p className="text-2xl">🧸</p>
          <p className="mt-2 font-semibold">Soy cuidador/a o guardería</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quiero registrar el día a día de los niños que cuido.
          </p>
        </Link>
        <Link
          href="/bienvenida?rol=padre"
          className="block rounded-2xl border border-border p-5 transition hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
        >
          <p className="text-2xl">👶</p>
          <p className="mt-2 font-semibold">Soy padre o madre</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quiero ver el diario de mi hijo o hija.
          </p>
        </Link>
      </div>
    </main>
  )
}
