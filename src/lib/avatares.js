import { creditosIconos } from './creditos'

// Deriva la lista de avatares disponibles directamente de
// creditos.js (misma fuente que el CHECK de la migracion inicial)
// en vez de mantener una cuarta copia de los mismos 27 nombres.
export const avatares = creditosIconos.map((c) => {
  const partes = c.archivo.split('/')
  const archivo = partes.pop()
  const carpeta = partes.pop()
  return {
    id: archivo.replace(/\.svg$/, ''),
    nombre: c.nombre,
    archivo: c.archivo,
    categoria: carpeta === 'insignias' ? 'superheroes' : 'animales',
  }
})
