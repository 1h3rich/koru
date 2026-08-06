import { createClient } from '@/lib/supabase/server'
import { Button, Cabecera, Field, Input, Mensaje, Select } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { crearPlatoMenu, borrarPlatoMenu } from './actions'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const ETIQUETA_DIA = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}
const ETIQUETA_COMIDA = { desayuno: '☀️ Desayuno', almuerzo: '🍽️ Almuerzo', merienda: '🥪 Merienda' }

const MENSAJES_ERROR = {
  datos_invalidos: 'Elige un día, una comida y escribe el plato.',
}

export default async function MenusPage({ searchParams }) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: menu } = await supabase
    .from('menu_semanal')
    .select('id, aula, dia_semana, comida, plato, alergenos')
    .order('dia_semana')

  const porDia = DIAS.map((dia) => ({
    dia,
    items: (menu ?? []).filter((m) => m.dia_semana === dia),
  }))

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <Cabecera volver="/panel/mas" titulo="🍽️ Menú semanal" />

        <form action={crearPlatoMenu} className="mb-8 space-y-3 rounded-2xl border border-border p-4">
          <div className="flex gap-3">
            <div className="w-36">
              <Field label="Día">
                <Select name="dia_semana" required defaultValue="">
                  <option value="" disabled>Elegir</option>
                  {DIAS.map((dia) => (
                    <option key={dia} value={dia}>{ETIQUETA_DIA[dia]}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="w-36">
              <Field label="Comida">
                <Select name="comida" required defaultValue="almuerzo">
                  {Object.entries(ETIQUETA_COMIDA).map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>{etiqueta}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Aula (opcional)">
              <Input name="aula" placeholder="Todas" />
            </Field>
          </div>
          <Field label="Plato">
            <Input name="plato" required placeholder="Ej: Lentejas con verduras" />
          </Field>
          <Field label="Alérgenos (opcional)">
            <Input name="alergenos" placeholder="Ej: gluten, apio" />
          </Field>
          <Button type="submit" className="w-full">Añadir</Button>
          <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
        </form>

        <div className="space-y-6">
          {porDia.map(({ dia, items }) => (
            <div key={dia}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">{ETIQUETA_DIA[dia]}</h2>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin platos.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5">
                      <span>
                        {ETIQUETA_COMIDA[m.comida]} — {m.plato}
                        {m.alergenos && <span className="text-danger"> · ⚠️ {m.alergenos}</span>}
                        {m.aula && <span className="text-muted-foreground"> ({m.aula})</span>}
                      </span>
                      <form action={borrarPlatoMenu}>
                        <input type="hidden" name="id" value={m.id} />
                        <Button type="submit" variant="ghost">Quitar</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
