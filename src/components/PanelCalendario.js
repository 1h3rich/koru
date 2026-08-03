'use client'

import { useState } from 'react'
import { Button, Field, Input, Mensaje, Select } from '@/components/ui'
import { CalendarioMes } from '@/components/CalendarioMes'

const MENSAJES_ERROR = {
  datos_invalidos: 'Elige una fecha, un tipo y escribe un título.',
  no_se_pudo_crear: 'Ha habido un problema al guardar. Inténtalo de nuevo.',
}

// Envuelve el calendario y el formulario de "Añadir evento" en un
// mismo componente para que tocar un día rellene directamente el
// campo Fecha del formulario, sin tener que escribirla a mano.
export function PanelCalendario({ eventos, crearEvento, borrarEvento, error }) {
  const [fecha, setFecha] = useState('')

  return (
    <>
      <div className="sombra-suave mb-8 rounded-3xl border border-border p-4">
        <CalendarioMes
          eventos={eventos}
          alBorrar={borrarEvento}
          diaSeleccionado={fecha}
          onDiaSeleccionado={setFecha}
        />
      </div>

      <form action={crearEvento} className="space-y-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium">Añadir evento</p>
        <div className="flex gap-3">
          <div className="w-40">
            <Field label="Fecha">
              <Input
                type="date"
                name="fecha"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </Field>
          </div>
          <div className="w-40">
            <Field label="Tipo">
              <Select name="tipo" required defaultValue="excursion">
                <option value="excursion">🚌 Excursión</option>
                <option value="festivo">🎉 Festivo</option>
                <option value="cumpleanos">🎂 Cumpleaños</option>
                <option value="otro">📌 Otro</option>
              </Select>
            </Field>
          </div>
          <Field label="Aula (opcional)">
            <Input name="aula" placeholder="Todas" />
          </Field>
        </div>
        <Field label="Título">
          <Input name="titulo" required placeholder="Ej: Excursión al zoo" />
        </Field>
        <Field label="Nota (opcional)">
          <Input name="nota" placeholder="Ej: Recordad traer la autorización firmada" />
        </Field>
        <Button type="submit" className="w-full">
          Añadir al calendario
        </Button>
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </form>
    </>
  )
}
