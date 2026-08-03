import { createClient } from '@/lib/supabase/server'
import { Chat } from '@/components/Chat'
import { enviarMensajePadre } from './actions'

export default async function MensajesPadrePage({ searchParams }) {
  const { nino: ninoIdElegido } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ninos } = await supabase.from('ninos').select('id, nombre, cuenta_id').order('nombre')

  if (!ninos || ninos.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <p className="text-sm text-muted-foreground">Aún no tienes ningún niño vinculado.</p>
      </main>
    )
  }

  const nino = ninos.find((n) => n.id === ninoIdElegido) ?? ninos[0]

  const { data: mensajes } = await supabase
    .from('mensajes')
    .select('id, autor_id, contenido, created_at')
    .eq('nino_id', nino.id)
    .order('created_at')

  return (
    <main className="mx-auto flex h-[calc(100vh-1px)] w-full max-w-2xl flex-col px-6 py-6">
      <h1 className="text-xl font-semibold">💬 {nino.nombre}</h1>

      {ninos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {ninos.map((n) => (
            <a
              key={n.id}
              href={`/mi-diario/mensajes?nino=${n.id}`}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                n.id === nino.id ? 'bg-primary-soft text-primary' : 'text-muted-foreground'
              }`}
            >
              {n.nombre}
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 flex-1 overflow-hidden">
        <Chat
          ninoId={nino.id}
          usuarioId={user.id}
          cuentaId={nino.cuenta_id}
          mensajesIniciales={mensajes ?? []}
          accion={enviarMensajePadre}
        />
      </div>
    </main>
  )
}
