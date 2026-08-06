'use client'

import { useState } from 'react'
import { traducirMensaje } from '@/app/mensajesAcciones'

// Traducción bajo demanda (nunca se guarda) para familias
// extranjeras — al idioma del propio navegador, sin tener que
// elegirlo a mano.
export function TraducirMensaje({ texto }) {
  const [traduccion, setTraduccion] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function traducir() {
    setCargando(true)
    const idioma = navigator.language?.split('-')[0] || 'en'
    const resultado = await traducirMensaje(texto, idioma)
    setTraduccion(resultado ?? 'No se ha podido traducir.')
    setCargando(false)
  }

  if (traduccion) {
    return <p className="mt-1 text-xs italic opacity-80">🌐 {traduccion}</p>
  }

  return (
    <button
      type="button"
      onClick={traducir}
      disabled={cargando}
      className="mt-1 text-xs underline opacity-70 hover:opacity-100"
    >
      {cargando ? 'Traduciendo…' : '🌐 Traducir'}
    </button>
  )
}
