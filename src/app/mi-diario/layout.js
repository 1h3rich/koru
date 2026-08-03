import { NavInferior } from '@/components/NavInferior'

// Envuelve las 4 pestanas del padre (Inicio/Mi hijo/Horario/Mas)
// con la misma barra de navegacion, en desktop arriba y en movil
// fija abajo (padding-bottom para que el contenido no quede tapado).
export default function MiDiarioLayout({ children }) {
  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
      <NavInferior />
    </div>
  )
}
