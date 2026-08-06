import { createClient } from '@/lib/supabase/server'
import { Button, Cabecera, Field, Input, Mensaje, Select } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import {
  crearEmpleado,
  borrarEmpleado,
  crearAusenciaPersonal,
  borrarAusenciaPersonal,
} from './actions'

const ETIQUETA_TIPO = {
  vacaciones: '🏖️ Vacaciones',
  sustitucion: '🔁 Sustitución',
  baja: '🤒 Baja',
  otro: '📌 Otro',
}

const MENSAJES_ERROR = {
  falta_nombre: 'Escribe un nombre.',
  datos_invalidos: 'Elige empleado, tipo y fechas.',
}

export default async function PersonalPage({ searchParams }) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombre, turno')
    .order('nombre')

  const empleadoIds = (empleados ?? []).map((e) => e.id)
  const { data: ausencias } =
    empleadoIds.length > 0
      ? await supabase
          .from('ausencias_personal')
          .select('id, empleado_id, tipo, fecha_inicio, fecha_fin, sustituto, notas')
          .in('empleado_id', empleadoIds)
          .order('fecha_inicio', { ascending: false })
      : { data: [] }

  const ausenciasPorEmpleado = new Map()
  for (const a of ausencias ?? []) {
    if (!ausenciasPorEmpleado.has(a.empleado_id)) ausenciasPorEmpleado.set(a.empleado_id, [])
    ausenciasPorEmpleado.get(a.empleado_id).push(a)
  }

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <Cabecera volver="/panel/mas" titulo="👥 Personal" />

        {(!empleados || empleados.length === 0) ? (
          <p className="text-sm text-muted-foreground">Todavía no has añadido a nadie del equipo.</p>
        ) : (
          <ul className="space-y-3">
            {empleados.map((emp) => (
              <li key={emp.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{emp.nombre}</p>
                    {emp.turno && <p className="text-sm text-muted-foreground">🗓️ {emp.turno}</p>}
                  </div>
                  <form action={borrarEmpleado}>
                    <input type="hidden" name="id" value={emp.id} />
                    <Button type="submit" variant="ghost">
                      Quitar
                    </Button>
                  </form>
                </div>

                {ausenciasPorEmpleado.get(emp.id)?.length > 0 && (
                  <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
                    {ausenciasPorEmpleado.get(emp.id).map((a) => (
                      <li key={a.id} className="flex items-center justify-between text-sm">
                        <span>
                          {ETIQUETA_TIPO[a.tipo]} · {a.fecha_inicio} → {a.fecha_fin}
                          {a.sustituto && ` · Sustituye: ${a.sustituto}`}
                        </span>
                        <form action={borrarAusenciaPersonal}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="text-xs text-muted-foreground underline">
                            Quitar
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}

                <form action={crearAusenciaPersonal} className="mt-3 space-y-2 border-t border-border pt-3">
                  <input type="hidden" name="empleado_id" value={emp.id} />
                  <div className="flex gap-2">
                    <div className="w-40">
                      <Select name="tipo" required defaultValue="vacaciones">
                        {Object.entries(ETIQUETA_TIPO).map(([valor, etiqueta]) => (
                          <option key={valor} value={valor}>
                            {etiqueta}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Input type="date" name="fecha_inicio" required className="flex-1" />
                    <Input type="date" name="fecha_fin" required className="flex-1" />
                  </div>
                  <Input name="sustituto" placeholder="Quién le sustituye (opcional)" />
                  <Button type="submit" variant="secondary" className="w-full">
                    Añadir ausencia
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={crearEmpleado} className="mt-6 flex gap-2 rounded-2xl border border-border p-4">
          <Field label="Nombre">
            <Input name="nombre" required placeholder="Ej: Marta" />
          </Field>
          <Field label="Turno (opcional)">
            <Input name="turno" placeholder="Ej: Mañanas 9-14" />
          </Field>
          <Button type="submit" className="mt-6 h-11">
            Añadir
          </Button>
        </form>
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
