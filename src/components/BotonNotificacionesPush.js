'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { guardarSuscripcionPush } from '@/app/acciones'

function base64UrlAUint8Array(base64Url) {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const cadena = atob(base64)
  return Uint8Array.from([...cadena].map((c) => c.charCodeAt(0)))
}

export function BotonNotificacionesPush({ vapidPublicKey }) {
  const [estado, setEstado] = useState('inicial')

  if (!vapidPublicKey) return null

  async function activar() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('no_soportado')
      return
    }

    setEstado('activando')
    try {
      const registro = await navigator.serviceWorker.register('/sw.js')
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setEstado('denegado')
        return
      }
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlAUint8Array(vapidPublicKey),
      })
      await guardarSuscripcionPush(suscripcion.toJSON())
      setEstado('activo')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'activo') {
    return <p className="text-sm text-alimentacion">✅ Notificaciones activadas en este dispositivo.</p>
  }
  if (estado === 'no_soportado') {
    return <p className="text-sm text-muted-foreground">Este navegador no admite notificaciones push.</p>
  }
  if (estado === 'denegado') {
    return <p className="text-sm text-muted-foreground">Permiso denegado — actívalo en los ajustes del navegador.</p>
  }

  return (
    <Button type="button" variant="secondary" onClick={activar} disabled={estado === 'activando'}>
      {estado === 'activando' ? 'Activando…' : '🔔 Activar notificaciones'}
    </Button>
  )
}
