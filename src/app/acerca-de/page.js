import Link from 'next/link'
import { Button, Mensaje, Textarea } from '@/components/ui'
import { reportarProblema } from './actions'

export const metadata = {
  title: 'Acerca de Koru',
}

export default async function AcercaDePage({ searchParams }) {
  const { error, enviado } = await searchParams

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href="/" className="mb-2 inline-block text-sm text-muted-foreground underline">
        Volver
      </Link>
      <h1 className="text-2xl font-semibold">Acerca de Koru</h1>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">🌿 Cómo funciona</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Koru es el diario digital que sustituye al grupo de WhatsApp de la clase. Cada día, la
          cuidadora registra la entrada y la salida, cómo ha comido, si ha dormido la siesta, su
          estado de ánimo y cualquier nota sobre el niño o la niña. Los padres lo ven al momento,
          sin tener que preguntar. No hay contraseñas que recordar: se entra siempre con un enlace
          que llega al email.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-primary-soft p-5">
        <h2 className="mb-3 text-lg font-semibold text-primary">💜 Privacidad</h2>
        <ul className="space-y-2 text-sm text-foreground">
          <li>🔒 Los datos se guardan en servidores dentro de la Unión Europea.</li>
          <li>
            👀 Solo la familia vinculada y el equipo de la guardería/cuidadora pueden ver la
            información de cada niño. Ningún otro padre ni tercero tiene acceso.
          </li>
          <li>
            📸 Las fotos que sube la cuidadora solo las puede ver y descargar el padre/madre
            vinculado — ni siquiera la propia cuidadora puede volver a verlas después de subirlas.
          </li>
          <li>
            🩹 Los accidentes o incidencias del día se registran como eventos puntuales, no como
            un historial médico permanente. Koru no guarda fichas de salud (alergias,
            medicación...) ni información de pagos o facturación.
          </li>
          <li>🗑️ Cualquier familia puede pedir el borrado de todos sus datos cuando quiera.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">🐞 Reportar un problema</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Si algo no funciona bien o tienes una sugerencia, cuéntamelo aquí.
        </p>
        {enviado ? (
          <Mensaje tipo="exito">Gracias, mensaje enviado.</Mensaje>
        ) : (
          <form action={reportarProblema} className="space-y-3">
            <Textarea
              name="mensaje"
              rows={4}
              required
              placeholder="Describe lo que ha pasado..."
            />
            <Button type="submit">Enviar</Button>
            {error === 'falta_mensaje' && <Mensaje tipo="error">Escribe un mensaje antes de enviar.</Mensaje>}
          </form>
        )}
      </section>
    </main>
  )
}
