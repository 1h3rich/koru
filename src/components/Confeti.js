'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { reproducirDing } from '@/lib/sonidos'

// Lanza confeti + un ding una vez al montarse. Se usa tras guardar
// el registro de "hoy" (?guardado=1) — un momento de celebracion
// pequeño pero que pega con el tono de una app de guarderia.
export function Confeti() {
  useEffect(() => {
    confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 35,
      origin: { y: 0.3 },
      colors: ['#2e86de', '#ff4fa3', '#ffc93c', '#d6249f'],
    })
    reproducirDing()
  }, [])

  return null
}
