import { Cabecera } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'

const INFORMES = [
  { tipo: 'asistencia', titulo: '🚪 Asistencia', descripcion: 'Entradas, salidas, ausencias y vacaciones de todos los niños.' },
  { tipo: 'pagos', titulo: '💳 Pagos', descripcion: 'Cuotas, estados de pago y conceptos de todos los niños.' },
  { tipo: 'evolucion', titulo: '📈 Evolución', descripcion: 'Observaciones de desarrollo por área y fecha.' },
]

export default function InformesPage() {
  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <Cabecera volver="/panel/mas" titulo="📊 Informes" subtitulo="Exporta los datos a CSV (Excel/Google Sheets)." />

        <ul className="space-y-3">
          {INFORMES.map((inf) => (
            <li key={inf.tipo} className="rounded-2xl border border-border p-4">
              <p className="font-medium">{inf.titulo}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{inf.descripcion}</p>
              <a
                href={`/panel/informes/csv?tipo=${inf.tipo}`}
                className="mt-2 inline-block text-sm font-medium text-primary underline"
              >
                Descargar CSV
              </a>
            </li>
          ))}
        </ul>
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
