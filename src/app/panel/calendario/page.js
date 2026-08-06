import { createClient } from '@/lib/supabase/server'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { PanelCalendario } from '@/components/PanelCalendario'
import { eventosCumpleanos } from '@/lib/cumpleanos'
import { crearEvento, borrarEvento } from './actions'

export default async function CalendarioPage({ searchParams }) {
  const { error } = await searchParams

  const supabase = await createClient()
  const [{ data: eventos }, { data: ninos }] = await Promise.all([
    supabase.from('eventos').select('id, aula, fecha, tipo, titulo, nota').order('fecha'),
    supabase.from('ninos').select('id, nombre, aula, fecha_nacimiento').eq('activo', true),
  ])

  const anioActual = new Date().getFullYear()
  const cumpleanos = eventosCumpleanos(ninos ?? [], { desde: anioActual - 1, hasta: anioActual + 2 })
  const todosLosEventos = [...(eventos ?? []), ...cumpleanos].sort((a, b) => a.fecha.localeCompare(b.fecha))

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
          eventos={todosLosEventos}
          crearEvento={crearEvento}
          borrarEvento={borrarEvento}
          error={error}
        />
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
