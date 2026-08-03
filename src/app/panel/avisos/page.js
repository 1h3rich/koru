import { createClient } from '@/lib/supabase/server'
import { Button, Field, Input, Mensaje, Textarea } from '@/components/ui'
import { NavInferiorCuidadora } from '@/components/NavInferiorCuidadora'
import { crearAviso, borrarAviso } from './actions'

const MENSAJES_ERROR = {
  datos_invalidos: 'Escribe un título y un mensaje.',
  no_se_pudo_crear: 'Ha habido un problema al guardar. Inténtalo de nuevo.',
}

export default async function AvisosPage({ searchParams }) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: avisos }, { data: ninos }, { data: confirmaciones }] = await Promise.all([
    supabase.from('avisos').select('id, aula, titulo, mensaje, requiere_autorizacion, created_at').order('created_at', { ascending: false }),
    supabase.from('ninos').select('id, aula').eq('activo', true),
    supabase.from('avisos_confirmaciones').select('aviso_id, nino_id'),
  ])

  function estadoAutorizacion(aviso) {
    const objetivo = (ninos ?? []).filter((n) => !aviso.aula || n.aula === aviso.aula)
    const confirmados = new Set(
      (confirmaciones ?? []).filter((c) => c.aviso_id === aviso.id).map((c) => c.nino_id)
    )
    const total = objetivo.length
    const hechos = objetivo.filter((n) => confirmados.has(n.id)).length
    return { hechos, total }
  }

  return (
    <div className="flex flex-1 flex-col md:flex-col-reverse">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-28">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Avisos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Anuncios a todos los padres de un aula (o de toda la cuenta).
          </p>
        </div>

        <form action={crearAviso} className="mb-8 space-y-3 rounded-2xl border border-border p-4">
          <div className="flex gap-3">
            <Field label="Título">
              <Input name="titulo" required placeholder="Ej: Excursión al zoo el 15" />
            </Field>
            <div className="w-32">
              <Field label="Aula (opcional)">
                <Input name="aula" placeholder="Todas" />
              </Field>
            </div>
          </div>
          <Field label="Mensaje">
            <Textarea
              name="mensaje"
              rows={3}
              required
              placeholder="Ej: Recordad traer la autorización firmada antes del viernes."
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requiere_autorizacion" className="h-4 w-4" />
            Necesita autorización explícita de cada niño
          </label>
          <Button type="submit" className="w-full">
            Enviar aviso
          </Button>
          <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
        </form>

        {!avisos || avisos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no has enviado ningún aviso.</p>
        ) : (
          <ul className="space-y-3">
            {avisos.map((aviso) => {
              const { hechos, total } = estadoAutorizacion(aviso)
              return (
                <li key={aviso.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">📢 {aviso.titulo}</p>
                      {aviso.aula && <p className="text-xs text-muted-foreground">Aula: {aviso.aula}</p>}
                    </div>
                    <form action={borrarAviso}>
                      <input type="hidden" name="id" value={aviso.id} />
                      <Button type="submit" variant="ghost">
                        Quitar
                      </Button>
                    </form>
                  </div>
                  <p className="mt-1 text-sm">{aviso.mensaje}</p>
                  {aviso.requiere_autorizacion && (
                    <p className="mt-2 text-xs font-medium text-primary">
                      ✅ {hechos}/{total} niños autorizados
                    </p>
                  )}
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
