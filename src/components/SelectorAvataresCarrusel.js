'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const CATEGORIAS = [
  { id: 'animales', etiqueta: '🐾 Animales' },
  { id: 'superheroes', etiqueta: '🦸 Superhéroes' },
]

// Selector con flechas: el avatar que se ve en el centro es el
// elegido, sin paso de "tocar para seleccionar" aparte (igual que
// pasar de mes en el calendario). Categoria aparte porque son dos
// colecciones con estilos muy distintos, mezclarlas en una sola
// tira no ayuda a decidir.
export function SelectorAvataresCarrusel({ avatares, avatarInicial }) {
  const inicial = avatares.find((a) => a.id === avatarInicial)

  const [categoria, setCategoria] = useState(inicial?.categoria ?? CATEGORIAS[0].id)
  const lista = avatares.filter((a) => a.categoria === categoria)
  const [indice, setIndice] = useState(inicial && inicial.categoria === categoria ? lista.findIndex((a) => a.id === inicial.id) : 0)
  const [direccion, setDireccion] = useState(0)

  const actual = lista[indice] ?? lista[0]

  function mover(delta) {
    setDireccion(delta)
    setIndice((i) => (i + delta + lista.length) % lista.length)
  }

  function cambiarCategoria(nuevaCategoria) {
    if (nuevaCategoria === categoria) return
    setCategoria(nuevaCategoria)
    setIndice(0)
  }

  return (
    <div>
      <input type="hidden" name="avatar_id" value={actual?.id ?? ''} />

      <div className="mb-3 flex gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => cambiarCategoria(c.id)}
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${
              categoria === c.id
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border text-muted-foreground'
            }`}
          >
            {c.etiqueta}
          </button>
        ))}
      </div>

      <div className="sombra-suave flex items-center justify-center gap-4 rounded-2xl border border-border py-5">
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label="Avatar anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
        >
          ‹
        </button>

        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direccion}>
            <motion.img
              key={`${categoria}-${actual?.id}`}
              src={actual?.archivo}
              alt={actual?.nombre}
              width={56}
              height={56}
              custom={direccion}
              initial={{ x: direccion >= 0 ? 40 : -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direccion >= 0 ? -40 : 40, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute"
            />
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => mover(1)}
          aria-label="Avatar siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
        >
          ›
        </button>
      </div>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        Elegido: <span className="font-medium text-foreground">{actual?.nombre}</span>
      </p>
    </div>
  )
}
