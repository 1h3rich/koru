// Service worker mínimo, solo para recibir notificaciones push. No
// cachea nada ni intercepta peticiones (no es un service worker de
// offline/PWA) — su único trabajo es mostrar la notificación que
// llega y abrir la app al tocarla.
self.addEventListener('push', (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = {}
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo || 'Koru', {
      body: datos.cuerpo || '',
      data: { url: datos.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(url))
})
