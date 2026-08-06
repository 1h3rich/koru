import { createClient } from '@/lib/supabase/server'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const ETIQUETA_DIA = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}
const ETIQUETA_COMIDA = { desayuno: '☀️ Desayuno', almuerzo: '🍽️ Almuerzo', merienda: '🥪 Merienda' }

export default async function MenuPadrePage() {
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

  const { data: menu } = await supabase
    .from('menu_semanal')
    .select('id, aula, dia_semana, comida, plato, alergenos')
    .eq('cuenta_id', nino.cuenta_id)
    .or(nino.aula ? `aula.eq.${nino.aula},aula.is.null` : 'aula.is.null')
    .order('dia_semana')

  const porDia = DIAS.map((dia) => ({
    dia,
    items: (menu ?? []).filter((m) => m.dia_semana === dia),
  }))

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">🍽️ Menú semanal</h1>
      <p className="mt-1 text-sm text-muted-foreground">De {nino.aula ?? 'la clase'} de {nino.nombre}.</p>

      <div className="mt-6 space-y-6">
        {porDia.map(({ dia, items }) => (
          <div key={dia}>
            <h2 className="mb-2 text-sm font-medium text-calendario">{ETIQUETA_DIA[dia]}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin platos.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((m) => (
                  <li key={m.id} className="sombra-suave rounded-2xl border border-border bg-calendario-soft px-4 py-2.5 text-sm">
                    {ETIQUETA_COMIDA[m.comida]} — {m.plato}
                    {m.alergenos && <span className="text-danger"> · ⚠️ {m.alergenos}</span>}
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
