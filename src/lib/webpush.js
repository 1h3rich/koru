import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const configurado = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

if (configurado) {
  webpush.setVapidDetails(
    'mailto:notificaciones@koru.onl',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Envía una notificación push a todos los dispositivos suscritos de
// un usuario. Nunca lanza — un fallo de push no debe romper el
// guardado del mensaje/aviso que lo dispara, igual que enviarEmail.
export async function enviarPush(userId, { titulo, cuerpo, url }) {
  if (!configurado || !userId) return

  const admin = createAdminClient()
  const { data: suscripciones } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  await Promise.all(
    (suscripciones ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ titulo, cuerpo, url })
        )
      } catch (error) {
        // 404/410 = la suscripción ya no existe (el navegador la
        // revocó) — se limpia para no reintentar en vano.
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    })
  )
}
