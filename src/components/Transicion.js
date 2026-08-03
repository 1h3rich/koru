'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'

// Transicion de entrada/salida entre pantallas: fundido + deslizado
// muy sutil, sin rebote. "Todo debe transmitir calma" (brief de
// diseno del usuario) — nunca una animacion llamativa.
export function Transicion({ children }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
