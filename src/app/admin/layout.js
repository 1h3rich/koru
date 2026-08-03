import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Solo tu email (ADMIN_EMAIL) puede entrar en /admin. No es un
// sistema de roles completo a proposito: para un unico operador es
// sobreingenieria, un email fijo en variable de entorno basta.
export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/inicio')
  }

  return children
}
