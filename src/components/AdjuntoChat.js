'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { urlFirmadaAdjuntoMensaje } from '@/lib/adjuntosMensajes'

// Resuelve su propia URL firmada al montar — tanto los mensajes
// iniciales como los que llegan por Realtime traen solo la ruta del
// storage, nunca una URL ya firmada.
export function AdjuntoChat({ ruta, tipo }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelado = false
    const supabase = createClient()
    urlFirmadaAdjuntoMensaje(supabase, ruta).then((u) => {
      if (!cancelado) setUrl(u)
    })
    return () => {
      cancelado = true
    }
  }, [ruta])

  if (!url) {
    return <p className="mt-1 text-xs text-muted-foreground">Cargando adjunto…</p>
  }

  if (tipo === 'video') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <video src={url} controls className="mt-1 max-w-full rounded-xl" />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Adjunto" className="mt-1 max-w-full rounded-xl" />
}
