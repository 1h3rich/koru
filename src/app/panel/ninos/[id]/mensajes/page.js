import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Cabecera } from '@/components/ui'
import { Chat } from '@/components/Chat'
import { enviarMensajeCuidadora } from './actions'

export default async function MensajesNinoPage({ params }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: nino } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, cuenta_id')
    .eq('id', id)
    .maybeSingle()

  if (!nino) {
    notFound()
  }

  const { data: mensajes } = await supabase
    .from('mensajes')
    .select('id, autor_id, contenido, created_at, leido_en')
    .eq('nino_id', id)
    .order('created_at')

  return (
    <main className="mx-auto flex h-[calc(100vh-1px)] w-full max-w-2xl flex-col px-6 py-6">
      <Cabecera volver="/panel/mensajes" titulo={`💬 ${nino.nombre} ${nino.apellido_inicial}.`} />
      <Chat
        ninoId={nino.id}
        usuarioId={user.id}
        cuentaId={nino.cuenta_id}
        mensajesIniciales={mensajes ?? []}
        accion={enviarMensajeCuidadora}
      />
    </main>
  )
}
