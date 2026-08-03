import { cerrarSesion } from '@/app/acciones'
import { Button } from '@/components/ui'

export default function PendientePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl">⏳</div>
      <h1 className="mt-3 text-xl font-semibold">Tu cuenta está en revisión</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Revisamos a mano cada cuenta nueva de guardería/cuidadora antes de activarla. Te
        avisaremos por email en cuanto esté lista.
      </p>
      <form action={cerrarSesion} className="mt-6">
        <Button variant="ghost" type="submit">
          Cerrar sesión
        </Button>
      </form>
    </main>
  )
}
