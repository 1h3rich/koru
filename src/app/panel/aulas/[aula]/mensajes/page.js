import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Cabecera } from '@/components/ui'
import { Chat } from '@/components/Chat'
import { enviarMensajeAulaCuidadora } from './actions'

export default async function MensajesAulaPage({ params }) {
  const { aula: aulaCodificada } = await params
  const aula = decodeURIComponent(aulaCodificada)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: nino } = await supabase
    .from('ninos')
    .select('id')
    .eq('aula', aula)
    .eq('activo', true)
    .maybeSingle()

  if (!nino) {
    notFound()
  }

  const { data: mensajes } = await supabase
    .from('mensajes_aula')
    .select('id, autor_id, contenido, created_at')
    .eq('aula', aula)
    .order('created_at')

  return (
    <main className="mx-auto flex h-[calc(100vh-1px)] w-full max-w-2xl flex-col px-6 py-6">
      <Cabecera volver="/panel/mensajes" titulo={`💬 ${aula}`} />
      <Chat
        aula={aula}
        usuarioId={user.id}
        cuentaId={user.id}
        mensajesIniciales={mensajes ?? []}
        accion={enviarMensajeAulaCuidadora}
      />
    </main>
  )
}
