import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const VISTAS = [
  { href: '/admin', etiqueta: 'Admin', icono: '🛠️' },
  { href: '/panel', etiqueta: 'Cuidador/a', icono: '🧸' },
  { href: '/mi-diario', etiqueta: 'Padre/madre', icono: '👶' },
]

// Display flotante, solo visible para ADMIN_EMAIL, para saltar entre
// las tres vistas de la app sin pasar por /admin cada vez. Chequeo
// de email en servidor (no spoofable desde el cliente) porque vive
// en el layout raíz, fuera de cualquier guarda de /panel o /admin.
export async function SelectorVistaAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    return null
  }

  return (
    <div className="fixed right-3 bottom-24 z-50 flex flex-col items-end gap-1.5 md:bottom-4">
      {VISTAS.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          title={v.etiqueta}
          className="sombra-suave flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 text-xs font-medium backdrop-blur-lg"
        >
          <span>{v.icono}</span>
          <span className="hidden sm:inline">{v.etiqueta}</span>
        </Link>
      ))}
    </div>
  )
}
