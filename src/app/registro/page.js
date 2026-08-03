import { crearCuenta } from './actions'
import { Button, Field, Input, Select, Mensaje } from '@/components/ui'

const MENSAJES_ERROR = {
  datos_invalidos: 'Rellena el nombre y elige un tipo de cuenta.',
  no_se_pudo_crear: 'Ha habido un problema al crear tu cuenta. Inténtalo de nuevo.',
}

export default async function RegistroPage({ searchParams }) {
  const { error } = await searchParams

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6">
      <p className="text-2xl">👋</p>
      <h1 className="mt-2 text-2xl font-semibold">Bienvenido/a a Koru</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cuéntanos si eres una guardería o una cuidadora individual. Revisamos cada cuenta nueva
        a mano antes de activarla, para que solo cuidadoras y guarderías reales tengan acceso.
      </p>
      <form action={crearCuenta} className="mt-6 space-y-4">
        <Field label="Nombre de tu guardería o el tuyo">
          <Input name="nombre_negocio" required autoFocus />
        </Field>
        <Field label="Tipo de cuenta">
          <Select name="tipo" required defaultValue="">
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option value="guarderia">Guardería</option>
            <option value="cuidadora">Cuidadora individual</option>
          </Select>
        </Field>
        <Button type="submit" className="w-full">
          Enviar solicitud
        </Button>
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </form>
    </main>
  )
}
