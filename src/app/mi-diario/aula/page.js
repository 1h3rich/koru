import { createClient } from '@/lib/supabase/server'
import { Chat } from '@/components/Chat'
import { enviarMensajeAulaPadre } from './actions'

export default async function AulaPadrePage({ searchParams }) {
  const { nino: ninoIdElegido } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ninos } = await supabase.from('ninos').select('id, nombre, cuenta_id, aula').order('nombre')
  const ninosConAula = (ninos ?? []).filter((n) => n.aula)

  if (ninosConAula.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <p className="text-sm text-muted-foreground">Todavía no hay ninguna aula vinculada.</p>
      </main>
    )
  }

  const aulasUnicas = []
  const vistas = new Set()
  for (const n of ninosConAula) {
    const clave = `${n.cuenta_id}:${n.aula}`
    if (!vistas.has(clave)) {
      vistas.add(clave)
      aulasUnicas.push(n)
    }
  }

  const nino = aulasUnicas.find((n) => n.id === ninoIdElegido) ?? aulasUnicas[0]

  const { data: mensajes } = await supabase
    .from('mensajes_aula')
    .select('id, autor_id, contenido, created_at')
    .eq('cuenta_id', nino.cuenta_id)
    .eq('aula', nino.aula)
    .order('created_at')

  return (
    <main className="mx-auto flex h-[calc(100vh-1px)] w-full max-w-2xl flex-col px-6 py-6">
      <h1 className="text-xl font-semibold">💬 {nino.aula}</h1>
      <p className="text-sm text-muted-foreground">Chat con el resto de familias del aula y la cuidadora.</p>

      {aulasUnicas.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {aulasUnicas.map((n) => (
            <a
              key={n.id}
              href={`/mi-diario/aula?nino=${n.id}`}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                n.id === nino.id ? 'bg-primary-soft text-primary' : 'text-muted-foreground'
              }`}
            >
              {n.aula}
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 flex-1 overflow-hidden">
        <Chat
          aula={nino.aula}
          usuarioId={user.id}
          cuentaId={nino.cuenta_id}
          mensajesIniciales={mensajes ?? []}
          accion={enviarMensajeAulaPadre}
        />
      </div>
    </main>
  )
}
