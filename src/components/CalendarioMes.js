'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const COLOR_TIPO = {
  excursion: 'bg-actividades',
  festivo: 'bg-calendario',
  cumpleanos: 'bg-animo',
  otro: 'bg-descanso',
}

const ETIQUETA_TIPO = {
  excursion: '🚌 Excursión',
  festivo: '🎉 Festivo',
  cumpleanos: '🎂 Cumpleaños',
  otro: '📌 Otro',
}

function celdasDelMes(anio, mes) {
  const primerDia = new Date(anio, mes, 1)
  // getDay(): 0=domingo..6=sabado. Queremos semana empezando en lunes.
  const offset = (primerDia.getDay() + 6) % 7
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  const celdas = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let dia = 1; dia <= diasEnMes; dia++) celdas.push(dia)
  return celdas
}

function fechaISO(anio, mes, dia) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function CalendarioMes({ eventos, alBorrar, onDiaSeleccionado, diaSeleccionado }) {
  const hoy = new Date()
  const [cursor, setCursor] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() })
  const [direccion, setDireccion] = useState(0)
  const [diaAbierto, setDiaAbierto] = useState(null)

  function cambiarMes(delta) {
    setDireccion(delta)
    setDiaAbierto(null)
    setCursor(({ anio, mes }) => {
      const fecha = new Date(anio, mes + delta, 1)
      return { anio: fecha.getFullYear(), mes: fecha.getMonth() }
    })
  }

  const celdas = celdasDelMes(cursor.anio, cursor.mes)
  const eventosPorFecha = new Map()
  for (const ev of eventos) {
    if (!eventosPorFecha.has(ev.fecha)) eventosPorFecha.set(ev.fecha, [])
    eventosPorFecha.get(ev.fecha).push(ev)
  }

  const fechaHoyISO = fechaISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const eventosDiaAbierto = diaAbierto ? eventosPorFecha.get(diaAbierto) ?? [] : []

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
        >
          ‹
        </button>
        <p className="text-lg font-semibold">
          {MESES[cursor.mes]} {cursor.anio}
        </p>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {DIAS_CORTOS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direccion}>
          <motion.div
            key={`${cursor.anio}-${cursor.mes}`}
            custom={direccion}
            initial={{ x: direccion >= 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direccion >= 0 ? -40 : 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="grid grid-cols-7 gap-y-1"
          >
            {celdas.map((dia, i) => {
              if (dia === null) return <div key={`vacio-${i}`} />
              const iso = fechaISO(cursor.anio, cursor.mes, dia)
              const eventosDelDia = eventosPorFecha.get(iso) ?? []
              const esHoy = iso === fechaHoyISO
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setDiaAbierto(eventosDelDia.length ? iso : null)
                    onDiaSeleccionado?.(iso)
                  }}
                  className={`mx-auto flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-full text-sm transition-colors ${
                    esHoy ? 'bg-primary-soft font-semibold text-primary' : 'text-foreground hover:bg-muted'
                  } ${diaAbierto === iso || diaSeleccionado === iso ? 'ring-2 ring-primary' : ''}`}
                >
                  {dia}
                  <span className="flex gap-0.5">
                    {eventosDelDia.slice(0, 3).map((ev, j) => (
                      <span key={j} className={`h-1.5 w-1.5 rounded-full ${COLOR_TIPO[ev.tipo]}`} />
                    ))}
                  </span>
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {diaAbierto && eventosDiaAbierto.length > 0 && (
        <div className="mt-4 space-y-2 rounded-2xl border border-border bg-muted/50 p-3">
          {eventosDiaAbierto.map((ev) => (
            <div key={ev.id} className="text-sm">
              <p className="font-medium">
                {ETIQUETA_TIPO[ev.tipo]} — {ev.titulo}
              </p>
              {ev.aula && <p className="text-xs text-muted-foreground">Aula: {ev.aula}</p>}
              {ev.nota && <p className="text-muted-foreground">{ev.nota}</p>}
              {alBorrar && (
                <form action={alBorrar} className="mt-1">
                  <input type="hidden" name="id" value={ev.id} />
                  <button type="submit" className="text-sm text-muted-foreground underline">
                    Quitar
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
