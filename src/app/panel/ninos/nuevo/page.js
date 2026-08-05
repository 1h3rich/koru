import { avatares } from '@/lib/avatares'
import { crearNino } from './actions'
import { Button, Cabecera, Field, Input, Mensaje } from '@/components/ui'
import { SelectorAvataresCarrusel } from '@/components/SelectorAvataresCarrusel'

const MENSAJES_ERROR = {
  datos_invalidos: 'Rellena el nombre, la inicial del apellido, el aula y elige un avatar.',
  avatar_en_uso: 'Ese avatar ya lo tiene otro niño activo. Elige otro.',
  no_se_pudo_crear: 'Ha habido un problema al crear el niño. Inténtalo de nuevo.',
  falta_email_padre: 'Añade el email de al menos un padre o madre.',
}

export default async function NuevoNinoPage({ searchParams }) {
  const { error } = await searchParams

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Cabecera titulo="Dar de alta un niño" volver="/panel" />

      <form action={crearNino} className="space-y-5">
        <div className="flex gap-3">
          <Field label="Nombre">
            <Input name="nombre" required autoFocus />
          </Field>
          <div className="w-32">
            <Field label="Inicial apellido">
              <Input name="apellido_inicial" required maxLength={3} />
            </Field>
          </div>
        </div>

        <Field label="Aula">
          <Input name="aula" required />
        </Field>

        <Field label="Fecha de nacimiento (opcional)">
          <Input type="date" name="fecha_nacimiento" className="max-w-[220px]" />
        </Field>

        <Field label="Email del padre o madre">
          <Input type="email" name="email_padre_1" required placeholder="email del padre o madre" />
        </Field>

        <Field label="Email del otro padre o madre (opcional)">
          <Input type="email" name="email_padre_2" placeholder="email del otro padre o madre" />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Avatar (para diferenciarlo de otros niños)
          </p>
          <SelectorAvataresCarrusel avatares={avatares} />
        </div>

        <Button type="submit" className="w-full">
          Crear niño
        </Button>
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </form>
    </main>
  )
}
