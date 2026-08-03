'use client'

import { useEffect, useState } from 'react'

const CLAVE = 'koru_aviso_cookies_visto'

// Aviso informativo, no un banner de aceptar/rechazar: la unica
// cookie que usa Koru es la de sesion de Supabase (tecnica,
// necesaria para mantenerte identificado), que no requiere
// consentimiento bajo la normativa de cookies -- solo informar. Sin
// cookies de analitica ni publicidad.
export function AvisoCookies() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(CLAVE)) {
      setVisible(true)
    }
  }, [])

  function cerrar() {
    localStorage.setItem(CLAVE, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-4 bottom-24 z-20 mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-lg md:bottom-4">
      <p className="text-sm text-foreground">
        🍪 Koru usa solo una cookie técnica para mantener tu sesión iniciada, así no
        tienes que entrar desde tu correo cada vez. No usamos cookies de publicidad ni
        de seguimiento.
      </p>
      <button
        type="button"
        onClick={cerrar}
        className="mt-3 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
      >
        Entendido
      </button>
    </div>
  )
}
