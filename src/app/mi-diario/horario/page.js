import { createClient } from '@/lib/supabase/server'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const ETIQUETA_DIA = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

export default async function HorarioPadrePage() {
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

  const [{ data: horarios }, { data: rutina }] = await Promise.all([
    supabase
      .from('horarios_semanales')
      .select('id, aula, dia_semana, hora, actividad')
      .eq('cuenta_id', nino.cuenta_id)
      .or(nino.aula ? `aula.eq.${nino.aula},aula.is.null` : 'aula.is.null')
      .order('hora'),
    supabase
      .from('rutina_diaria')
      .select('id, aula, hora, actividad')
      .eq('cuenta_id', nino.cuenta_id)
      .or(nino.aula ? `aula.eq.${nino.aula},aula.is.null` : 'aula.is.null')
      .order('hora'),
  ])

  const porDia = DIAS.map((dia) => ({
    dia,
    items: (horarios ?? []).filter((h) => h.dia_semana === dia),
  }))

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">🗓️ Rutina y horario</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Actividades habituales de {nino.aula ?? 'la clase'} de {nino.nombre}.
      </p>

      {rutina && rutina.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-calendario">Todos los días</h2>
          <ul className="space-y-2">
            {rutina.map((r) => (
              <li
                key={r.id}
                className="sombra-suave rounded-2xl border border-border bg-calendario-soft px-4 py-2.5 text-sm"
              >
                {r.hora.slice(0, 5)} — {r.actividad}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {porDia.map(({ dia, items }) => (
          <div key={dia}>
            <h2 className="mb-2 text-sm font-medium text-calendario">{ETIQUETA_DIA[dia]}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividades.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((h) => (
                  <li
                    key={h.id}
                    className="sombra-suave rounded-2xl border border-border bg-calendario-soft px-4 py-2.5 text-sm"
                  >
                    {h.hora.slice(0, 5)} — {h.actividad}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
