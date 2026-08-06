'use client'

import { Button } from '@/components/ui'

// Usa la función de imprimir del propio navegador (Guardar como PDF
// ya es una opción del diálogo de impresión) — no hace falta ninguna
// librería de generación de PDF para esto.
export function BotonImprimir() {
  return (
    <Button type="button" variant="secondary" className="print:hidden" onClick={() => window.print()}>
      🖨️ Imprimir / PDF
    </Button>
  )
}
