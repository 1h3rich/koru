'use client'

import { motion } from 'motion/react'

// Pastilla de selección rápida (comida/siesta/ánimo en la página
// "Hoy"). Radio nativo por debajo, el formulario funciona igual sin
// JS. Colores por categoría: alimentación=verde, descanso=azul,
// ánimo=rosa, actividades=amarillo (ver globals.css).
export function SelectorPastilla({ nombre, valor, etiqueta, seleccionado, color = 'primary' }) {
  const id = `${nombre}-${valor}`
  const colorSeleccionado = {
    primary: 'peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary',
    alimentacion: 'peer-checked:border-alimentacion peer-checked:bg-alimentacion-soft peer-checked:text-alimentacion',
    descanso: 'peer-checked:border-descanso peer-checked:bg-descanso-soft peer-checked:text-descanso',
    animo: 'peer-checked:border-animo peer-checked:bg-animo-soft peer-checked:text-animo',
    actividades: 'peer-checked:border-actividades peer-checked:bg-actividades-soft peer-checked:text-actividades',
  }[color]

  return (
    <div>
      <input
        type="radio"
        name={nombre}
        value={valor}
        id={id}
        defaultChecked={seleccionado === valor}
        className="peer sr-only"
      />
      <motion.label
        htmlFor={id}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-border px-3 text-sm font-medium hover:bg-muted ${colorSeleccionado}`}
      >
        {etiqueta}
      </motion.label>
    </div>
  )
}
