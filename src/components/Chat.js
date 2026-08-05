'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Chat en tiempo real vía Supabase Realtime (solo para recibir
// mensajes nuevos sin recargar). Enviar sigue siendo un <form>
// normal con Server Action + redirect, igual que el resto de la
// app: funciona igual sin JS, y tras el redirect el propio servidor
// ya trae el mensaje enviado en la lista inicial.
export function Chat({ ninoId, usuarioId, cuentaId, mensajesIniciales, accion }) {
  const [mensajes, setMensajes] = useState(mensajesIniciales)
  const finRef = useRef(null)

  useEffect(() => {
    setMensajes(mensajesIniciales)
  }, [mensajesIniciales])

  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel(`mensajes-${ninoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `nino_id=eq.${ninoId}` },
        (payload) => {
          setMensajes((actuales) =>
            actuales.some((m) => m.id === payload.new.id) ? actuales : [...actuales, payload.new]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [ninoId])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes.length])

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {mensajes.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Todavía no hay mensajes. Escribe el primero.
          </p>
        ) : (
          mensajes.map((m) => {
            const esCuidadora = m.autor_id === cuentaId
            const esMio = m.autor_id === usuarioId
            const etiqueta = esMio ? 'Tú' : esCuidadora ? 'Cuidadora' : 'Padre/madre'
            return (
              <div key={m.id} className={`flex flex-col ${esMio ? 'items-end' : 'items-start'}`}>
                <span className="mb-0.5 px-1 text-xs text-muted-foreground">{etiqueta}</span>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    esMio
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {m.contenido}
                </div>
              </div>
            )
          })
        )}
        <div ref={finRef} />
      </div>

      <form action={accion} className="flex gap-2 border-t border-border pt-3">
        <input type="hidden" name="nino_id" value={ninoId} />
        <input
          type="text"
          name="contenido"
          required
          autoComplete="off"
          placeholder="Escribe un mensaje..."
          className="min-h-11 flex-1 rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-2 focus:outline-primary"
        />
        <button
          type="submit"
          aria-label="Enviar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground transition-transform active:scale-90"
        >
          ➤
        </button>
      </form>
    </div>
  )
}
