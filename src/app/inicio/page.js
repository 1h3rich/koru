import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Router de roles: tras iniciar sesión (login o callback), decide a
// dónde va cada usuario. El admin (tu email, ver ADMIN_EMAIL) va
// siempre a /admin. Para el resto no hay un campo "rol" explícito:
// se deduce de si existe una fila en "cuentas" (es cuidadora/
// guardería, aprobada o pendiente -> /panel/layout.js decide) o en
// "nino_padre" (es un padre ya vinculado a algún niño). Si no hay
// ninguna de las dos, va a /bienvenida a elegir qué es.
export default async function InicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.email === process.env.ADMIN_EMAIL) {
    redirect('/admin')
  }

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (cuenta) {
    redirect('/panel')
  }

  const { data: vinculo } = await supabase
    .from('nino_padre')
    .select('nino_id')
    .eq('padre_id', user.id)
    .limit(1)
    .maybeSingle()

  if (vinculo) {
    redirect('/mi-diario')
  }

  redirect('/bienvenida')
}
