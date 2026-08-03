import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { avatares } from '@/lib/avatares'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'

export default async function MensajesPage() {
  const supabase = await createClient()

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial, avatar_id')
    .eq('activo', true)
    .order('nombre')

  const ninoIds = (ninos ?? []).map((n) => n.id)
  const { data: mensajes } =
    ninoIds.length > 0
      ? await supabase
          .from('mensajes')
          .select('nino_id, contenido, created_at')
          .in('nino_id', ninoIds)
          .order('created_at', { ascending: false })
      : { data: [] }

  const ultimoPorNino = new Map()
  for (const m of mensajes ?? []) {
    if (!ultimoPorNino.has(m.nino_id)) ultimoPorNino.set(m.nino_id, m)
  }

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <h1 className="text-2xl font-semibold">Mensajes</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Chat privado con cada familia.</p>

        {!ninos || ninos.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Todavía no has dado de alta a ningún niño.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {ninos.map((nino) => {
              const avatar = avatares.find((a) => a.id === nino.avatar_id)
              const ultimo = ultimoPorNino.get(nino.id)
              return (
                <li key={nino.id}>
                  <Link
                    href={`/panel/ninos/${nino.id}/mensajes`}
                    className="sombra-suave flex items-center gap-3 rounded-3xl border border-border bg-background p-4"
                  >
                    {avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar.archivo} alt="" width={40} height={40} />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {nino.nombre} {nino.apellido_inicial}.
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {ultimo ? ultimo.contenido : 'Sin mensajes todavía'}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <NavInferiorCuidadora />
    </div>
  )
}
