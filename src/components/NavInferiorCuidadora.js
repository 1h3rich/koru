'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PESTANAS = [
  { href: '/panel', etiqueta: 'Inicio', icono: '🏠' },
  { href: '/panel/mensajes', etiqueta: 'Mensajes', icono: '💬' },
  { href: '/panel/calendario', etiqueta: 'Calendario', icono: '📅' },
  { href: '/panel/horarios', etiqueta: 'Horario', icono: '🗓️' },
  { href: '/panel/mas', etiqueta: 'Más', icono: '⋯' },
]

// Barra de pestañas de la cuidadora, gemela de NavInferior (padre):
// niños/aulas quedan en Inicio como pantalla principal, calendario y
// horario en primera fila en vez de botones sueltos.
export function NavInferiorCuidadora() {
  const pathname = usePathname()

  return (
    <nav
      className="sombra-suave fixed inset-x-0 bottom-4 z-10 mx-auto flex w-fit rounded-full border border-border bg-background/90 backdrop-blur-lg
                 md:static md:mx-0 md:w-auto md:bottom-auto md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:bg-background md:backdrop-blur-none"
    >
      <ul className="flex items-center gap-1 px-2 py-2 md:max-w-2xl md:gap-8 md:px-0 md:py-0">
        {PESTANAS.map((p) => {
          const activo = pathname === p.href
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-label={p.etiqueta}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition-colors md:h-auto md:w-auto md:flex-row md:gap-1.5 md:rounded-none md:px-0 md:py-3.5 md:text-base ${
                  activo ? 'bg-primary-soft text-primary md:bg-transparent' : 'text-muted-foreground'
                }`}
              >
                <span>{p.icono}</span>
                <span className="hidden md:inline md:text-sm">{p.etiqueta}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
