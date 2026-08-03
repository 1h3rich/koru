import { createClient } from '@/lib/supabase/server'
import { CalendarioMes } from '@/components/CalendarioMes'

export default async function CalendarioPadrePage() {
  const supabase = await createClient()

  const { data: ninos } = await supabase.from('ninos').select('id, nombre, cuenta_id, aula').order('nombre')
  const nino = ninos?.[0]

  if (!nino) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <p className="text-sm text-muted-foreground">Aún no tienes ningún niño vinculado.</p>
      </main>
    )
  }

  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, aula, fecha, tipo, titulo, nota')
    .eq('cuenta_id', nino.cuenta_id)
    .or(nino.aula ? `aula.eq.${nino.aula},aula.is.null` : 'aula.is.null')
    .order('fecha')

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">📅 Calendario</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Excursiones, festivos y otros eventos de {nino.aula ?? 'la clase'} de {nino.nombre}.
      </p>

      <div className="sombra-suave mt-6 rounded-3xl border border-border p-4">
        <CalendarioMes eventos={eventos ?? []} />
      </div>
    </main>
  )
}
