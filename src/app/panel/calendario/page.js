import { createClient } from '@/lib/supabase/server'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { PanelCalendario } from '@/components/PanelCalendario'
import { crearEvento, borrarEvento } from './actions'

export default async function CalendarioPage({ searchParams }) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, aula, fecha, tipo, titulo, nota')
    .order('fecha')

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Excursiones, festivos y otros eventos con fecha concreta.
          </p>
        </div>

        <PanelCalendario
          eventos={eventos ?? []}
          crearEvento={crearEvento}
          borrarEvento={borrarEvento}
          error={error}
        />
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
