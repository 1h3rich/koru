import { createClient } from '@/lib/supabase/server'
import { Button, Field, Input, Mensaje, Select } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { crearHorario, borrarHorario, crearRutina, borrarRutina } from './actions'

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

const MENSAJES_ERROR = {
  datos_invalidos: 'Elige un día, una hora y escribe la actividad.',
  no_se_pudo_crear: 'Ha habido un problema al guardar. Inténtalo de nuevo.',
}

export default async function HorariosPage({ searchParams }) {
  const { error } = await searchParams

  const supabase = await createClient()
  const [{ data: horarios }, { data: rutina }] = await Promise.all([
    supabase.from('horarios_semanales').select('id, aula, dia_semana, hora, actividad').order('hora'),
    supabase.from('rutina_diaria').select('id, aula, hora, actividad').order('hora'),
  ])

  const porDia = DIAS.map((dia) => ({
    dia,
    items: (horarios ?? []).filter((h) => h.dia_semana === dia),
  }))

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Rutina diaria</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Actividades que se repiten todos los días a la misma hora (ej. la siesta o el patio).
          </p>
        </div>

        <form action={crearRutina} className="mb-6 space-y-3 rounded-2xl border border-border p-4">
          <div className="flex gap-3">
            <div className="w-32">
              <Field label="Hora">
                <Input type="time" name="hora" required />
              </Field>
            </div>
            <Field label="Aula (opcional)">
              <Input name="aula" placeholder="Todas" />
            </Field>
          </div>
          <Field label="Actividad">
            <Input name="actividad" required placeholder="Ej: Siesta" />
          </Field>
          <Button type="submit" className="w-full">
            Añadir a la rutina diaria
          </Button>
          <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
        </form>

        {rutina && rutina.length > 0 && (
          <ul className="mb-8 space-y-2">
            {rutina.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5"
              >
                <span>
                  {r.hora.slice(0, 5)} — {r.actividad}
                  {r.aula && <span className="text-muted-foreground"> ({r.aula})</span>}
                </span>
                <form action={borrarRutina}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" variant="ghost">
                    Quitar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Horario semanal</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Se muestra igual a los padres cada semana, no cambia día a día.
          </p>
        </div>

      <form action={crearHorario} className="mb-8 space-y-3 rounded-2xl border border-border p-4">
        <div className="flex gap-3">
          <div className="w-40">
            <Field label="Día">
              <Select name="dia_semana" required defaultValue="">
                <option value="" disabled>
                  Elegir
                </option>
                {DIAS.map((dia) => (
                  <option key={dia} value={dia}>
                    {ETIQUETA_DIA[dia]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-32">
            <Field label="Hora">
              <Input type="time" name="hora" required />
            </Field>
          </div>
          <Field label="Aula (opcional)">
            <Input name="aula" placeholder="Todas" />
          </Field>
        </div>
        <Field label="Actividad">
          <Input name="actividad" required placeholder="Ej: Psicomotricidad" />
        </Field>
        <Button type="submit" className="w-full">
          Añadir al horario
        </Button>
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </form>

      <div className="space-y-6">
        {porDia.map(({ dia, items }) => (
          <div key={dia}>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">{ETIQUETA_DIA[dia]}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividades.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5"
                  >
                    <span>
                      {h.hora.slice(0, 5)} — {h.actividad}
                      {h.aula && <span className="text-muted-foreground"> ({h.aula})</span>}
                    </span>
                    <form action={borrarHorario}>
                      <input type="hidden" name="id" value={h.id} />
                      <Button type="submit" variant="ghost">
                        Quitar
                      </Button>
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
