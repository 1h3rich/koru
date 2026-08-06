import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button, Cabecera, Field, Input, Mensaje, Textarea } from '@/components/ui'
import { SelectorPastilla as OpcionPill } from '@/components/SelectorPastilla'
import { registrarEntrada, guardarRestoDia, reportarAccidente, anadirHito, borrarHito } from './actions'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const MENSAJES_ERROR = {
  no_se_pudo_guardar: 'Ha habido un problema al guardar. Inténtalo de nuevo.',
  falta_hora: 'Indica la hora de entrada.',
  falta_descripcion_accidente: 'Describe qué ha pasado antes de enviar.',
  falta_hito: 'Indica la hora y qué ha pasado.',
}

export default async function RegistrarHoyPage({ params, searchParams }) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: nino } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, aula, cuenta_id')
    .eq('id', id)
    .maybeSingle()

  if (!nino) {
    notFound()
  }

  const ahora = new Date()
  const fecha = ahora.toISOString().slice(0, 10)
  const horaActual = ahora.toTimeString().slice(0, 5)
  const diaSemana = DIAS_SEMANA[ahora.getDay()]

  const [{ data: registro }, { data: asistencia }, { data: horario }, { data: hitos }] = await Promise.all([
    supabase
      .from('registros_diarios')
      .select('*')
      .eq('nino_id', id)
      .eq('fecha', fecha)
      .maybeSingle(),
    supabase
      .from('asistencia')
      .select('*')
      .eq('nino_id', id)
      .eq('fecha', fecha)
      .maybeSingle(),
    supabase
      .from('horarios_semanales')
      .select('hora, actividad')
      .eq('cuenta_id', nino.cuenta_id)
      .eq('dia_semana', diaSemana)
      .or(nino.aula ? `aula.eq.${nino.aula},aula.is.null` : 'aula.is.null')
      .order('hora'),
    supabase
      .from('hitos_dia')
      .select('id, hora, descripcion')
      .eq('nino_id', id)
      .eq('fecha', fecha)
      .order('hora'),
  ])

  const yaLlego = Boolean(asistencia?.hora_entrada)

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Cabecera
        volver={`/panel/ninos/${nino.id}`}
        titulo={`Hoy · ${nino.nombre} ${nino.apellido_inicial}.`}
        subtitulo={new Date(fecha).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      />

      {horario && horario.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-muted/50 p-3">
          <p className="mb-1 text-sm font-medium text-muted-foreground">Horario de hoy</p>
          <ul className="space-y-0.5 text-sm">
            {horario.map((h, i) => (
              <li key={i}>
                {h.hora.slice(0, 5)} — {h.actividad}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!yaLlego ? (
        // Paso 1: al llegar el nino. Nada mas hasta que llegue —
        // todavia no se sabe como va a ir el dia.
        <form action={registrarEntrada} className="space-y-4">
          <input type="hidden" name="nino_id" value={nino.id} />
          <input type="hidden" name="fecha" value={fecha} />
          <p className="text-sm text-muted-foreground">
            Todavía no has registrado la llegada de {nino.nombre} hoy.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de entrada">
              <Input type="time" name="hora_entrada" defaultValue={horaActual} required />
            </Field>
            <Field label="Quién entrega">
              <Input name="quien_entrega" placeholder="Nombre" />
            </Field>
          </div>
          <Button type="submit" className="w-full">
            🚪 Registrar entrada
          </Button>
          <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
        </form>
      ) : (
        <>
          <form
            action={reportarAccidente}
            className={`mb-6 space-y-2 rounded-2xl border p-4 ${
              registro?.accidente ? 'border-danger bg-danger/10' : 'border-border'
            }`}
          >
            <input type="hidden" name="nino_id" value={nino.id} />
            <input type="hidden" name="fecha" value={fecha} />
            <h2 className="text-sm font-medium">
              🩹 {registro?.accidente ? 'Incidencia de hoy' : 'Reportar un accidente o incidencia'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Se avisa a los padres al instante, sin esperar al resumen del día.
            </p>
            <Textarea
              name="accidente_descripcion"
              rows={2}
              defaultValue={registro?.accidente_descripcion ?? ''}
              placeholder="Ej: Se ha caído en el patio y tiene un rasponazo en la rodilla, ya está limpio."
            />
            <Button type="submit" variant={registro?.accidente ? 'secondary' : 'danger'}>
              {registro?.accidente ? 'Actualizar y volver a avisar' : 'Avisar a los padres'}
            </Button>
            <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
          </form>

          <div className="mb-6 rounded-2xl border border-border p-4">
            <h2 className="text-sm font-medium">🕐 Línea temporal de hoy (opcional)</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Momentos sueltos con hora exacta, además del resumen de abajo — solo si te apetece
              anotarlos.
            </p>

            {hitos && hitos.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {hitos.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-medium">{h.hora.slice(0, 5)}</span> — {h.descripcion}
                    </span>
                    <form action={borrarHito}>
                      <input type="hidden" name="id" value={h.id} />
                      <input type="hidden" name="nino_id" value={nino.id} />
                      <button type="submit" className="text-xs text-muted-foreground underline">
                        Quitar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form action={anadirHito} className="mt-3 flex gap-2">
              <input type="hidden" name="nino_id" value={nino.id} />
              <input type="hidden" name="fecha" value={fecha} />
              <div className="w-28">
                <Input type="time" name="hora" defaultValue={horaActual} required />
              </div>
              <Input name="descripcion" placeholder="Ej: Desayuno" className="flex-1" />
              <Button type="submit" variant="secondary">
                Añadir
              </Button>
            </form>
            <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
          </div>

          {/* Paso 2: el resto del dia (como ha ido) + la salida, que se
              rellena cuando lo recogen — no antes. */}
          <form action={guardarRestoDia} className="space-y-6">
          <input type="hidden" name="nino_id" value={nino.id} />
          <input type="hidden" name="fecha" value={fecha} />

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">🚪 Asistencia</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora de entrada">
                <Input type="time" name="hora_entrada" defaultValue={asistencia.hora_entrada.slice(0, 5)} required />
              </Field>
              <Field label="Quién entrega">
                <Input name="quien_entrega" defaultValue={asistencia.quien_entrega ?? ''} placeholder="Nombre" />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">🍽 Alimentación</h2>
            <div className="grid grid-cols-3 gap-2">
              <OpcionPill nombre="comida" valor="bien" etiqueta="Bien" seleccionado={registro?.comida} color="alimentacion" />
              <OpcionPill nombre="comida" valor="regular" etiqueta="Regular" seleccionado={registro?.comida} color="alimentacion" />
              <OpcionPill nombre="comida" valor="nada" etiqueta="Nada" seleccionado={registro?.comida} color="alimentacion" />
            </div>
            <p className="mt-2 mb-1 text-xs font-medium text-muted-foreground">Cantidad</p>
            <div className="grid grid-cols-4 gap-2">
              <OpcionPill nombre="cantidad_comida" valor="todo" etiqueta="Todo" seleccionado={registro?.cantidad_comida} color="alimentacion" />
              <OpcionPill nombre="cantidad_comida" valor="mitad" etiqueta="La mitad" seleccionado={registro?.cantidad_comida} color="alimentacion" />
              <OpcionPill nombre="cantidad_comida" valor="poco" etiqueta="Poco" seleccionado={registro?.cantidad_comida} color="alimentacion" />
              <OpcionPill nombre="cantidad_comida" valor="nada" etiqueta="Nada" seleccionado={registro?.cantidad_comida} color="alimentacion" />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">🌙 Descanso</h2>
            <div className="grid grid-cols-3 gap-2">
              <OpcionPill nombre="siesta" valor="bien" etiqueta="Bien" seleccionado={registro?.siesta} color="descanso" />
              <OpcionPill nombre="siesta" valor="poco" etiqueta="Poco" seleccionado={registro?.siesta} color="descanso" />
              <OpcionPill nombre="siesta" valor="nada" etiqueta="Nada" seleccionado={registro?.siesta} color="descanso" />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">😊 Estado de ánimo</h2>
            <div className="grid grid-cols-4 gap-2">
              <OpcionPill nombre="estado_animo" valor="contento" etiqueta="😊 Contento" seleccionado={registro?.estado_animo} color="animo" />
              <OpcionPill nombre="estado_animo" valor="tranquilo" etiqueta="😌 Tranquilo" seleccionado={registro?.estado_animo} color="animo" />
              <OpcionPill nombre="estado_animo" valor="inquieto" etiqueta="😕 Inquieto" seleccionado={registro?.estado_animo} color="animo" />
              <OpcionPill nombre="estado_animo" valor="triste" etiqueta="😢 Triste" seleccionado={registro?.estado_animo} color="animo" />
            </div>
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="panal_cambiado"
                defaultChecked={registro?.panal_cambiado ?? false}
                className="h-5 w-5 rounded-md border-border"
              />
              🧷 Se ha cambiado el pañal / ha ido al baño
            </label>
            <Input
              name="panal_bano"
              defaultValue={registro?.panal_bano ?? ''}
              placeholder="Notas (opcional): ej. 2 cambios, bañito a las 16:00"
              className="mt-2"
            />
          </section>

          <Field label="🌡️ Temperatura en °C (opcional, solo si está enfermo)">
            <Input
              type="number"
              step="0.1"
              min="30"
              max="43"
              name="temperatura"
              defaultValue={registro?.temperatura ?? ''}
              placeholder="Ej: 37.5"
              className="max-w-[140px]"
            />
          </Field>

          <Field label="✏️ Resume lo que han hecho los pequeños diablillos, en dos líneas (opcional)">
            <Textarea
              name="actividad"
              defaultValue={registro?.actividad ?? ''}
              rows={2}
              placeholder="Ej: Hoy han descubierto la plastilina y no ha habido quien los pare..."
            />
          </Field>

          <Field label={registro?.foto_url ? 'Foto (ya hay una subida — elige otra para reemplazarla)' : 'Foto (opcional)'}>
            <input
              type="file"
              name="foto"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="block w-full text-sm text-muted-foreground"
            />
          </Field>
          <p className="-mt-4 text-xs text-muted-foreground">
            Solo la verá el padre/madre vinculado — ni tú misma podrás volver a verla una vez
            subida.
          </p>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">🚶 Salida</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Rellena esto cuando vengan a recogerlo, no antes.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora de salida">
                <Input type="time" name="hora_salida" defaultValue={asistencia?.hora_salida?.slice(0, 5)} />
              </Field>
              <Field label="Quién recoge">
                <Input name="quien_recoge" defaultValue={asistencia?.quien_recoge ?? ''} placeholder="Nombre" />
              </Field>
            </div>
          </section>

          <Button type="submit" className="w-full">
            Guardar
          </Button>
          <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
        </form>
        </>
      )}
    </main>
  )
}
