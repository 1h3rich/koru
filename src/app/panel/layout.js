import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Guarda de todo /panel/*: hace falta tener cuenta creada Y
// aprobada. Sin cuenta -> /bienvenida (elegir rol). Con cuenta pero
// sin aprobar -> /pendiente. Centralizado aquí para no repetir el
// chequeo en cada página del panel.
export default async function PanelLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: cuenta } = await supabase
    .from('cuentas')
    .select('aprobada, color_acento')
    .eq('id', user.id)
    .maybeSingle()

  if (!cuenta) {
    redirect('/bienvenida')
  }

  if (!cuenta.aprobada) {
    redirect('/pendiente')
  }

  return (
    <div data-acento={cuenta.color_acento !== 'morado' ? cuenta.color_acento : undefined} className="contents">
      {children}
    </div>
  )
}
