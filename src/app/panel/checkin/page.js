import { Cabecera, Mensaje } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'

const MENSAJES_ERROR = {
  token_invalido: 'Ese código QR no es válido.',
  sin_ninos: 'Ese código no corresponde a ningún niño de tu cuenta.',
}

function etiquetaResultado(item) {
  if (item.tipo === 'completo') return 'Ya se había registrado entrada y salida hoy.'
  if (item.tipo === 'entrada') return `Entrada registrada a las ${item.hora}.`
  return `Salida registrada a las ${item.hora}.`
}

export default async function ResultadoCheckinPage({ searchParams }) {
  const { r, error } = await searchParams
  const resultados = r ? JSON.parse(decodeURIComponent(r)) : []

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <Cabecera volver="/panel" titulo="📷 Check-in / check-out" />

        {error && (
          <div className="mt-4">
            <Mensaje tipo="error">{MENSAJES_ERROR[error] ?? 'No se ha podido procesar el código.'}</Mensaje>
          </div>
        )}

        {resultados.length > 0 && (
          <ul className="mt-4 space-y-2">
            {resultados.map((item) => (
              <li key={item.nombre} className="rounded-2xl border border-border px-4 py-3">
                <p className="font-medium">{item.nombre}</p>
                <p className="text-sm text-muted-foreground">{etiquetaResultado(item)}</p>
              </li>
            ))}
          </ul>
        )}

        {!error && resultados.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Escanea el código QR de un padre/madre con la cámara del móvil para registrar la
            entrada o salida de sus niños.
          </p>
        )}
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
