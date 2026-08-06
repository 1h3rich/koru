import { createClient } from '@/lib/supabase/server'
import { BotonImprimir } from '@/components/BotonImprimir'

const ETIQUETA_CONCEPTO = {
  mensualidad: 'Mensualidad',
  comedor: 'Comedor',
  horas_extra: 'Horas extra',
  material: 'Material escolar',
  otro: 'Otro',
}

export default async function FacturacionPadrePage({ searchParams }) {
  const { nino: ninoIdElegido } = await searchParams
  const supabase = await createClient()

  const { data: ninos } = await supabase.from('ninos').select('id, nombre').order('nombre')

  if (!ninos || ninos.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <p className="text-sm text-muted-foreground">Aún no tienes ningún niño vinculado.</p>
      </main>
    )
  }

  const nino = ninos.find((n) => n.id === ninoIdElegido) ?? ninos[0]

  const { data: cuotas } = await supabase
    .from('cuotas')
    .select('id, concepto, descripcion, periodo, importe, estado')
    .eq('nino_id', nino.id)
    .order('periodo', { ascending: false })

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">💳 Facturación · {nino.nombre}</h1>
        <BotonImprimir />
      </div>

      {ninos.length > 1 && (
        <div className="mt-3 flex gap-2">
          {ninos.map((n) => (
            <a
              key={n.id}
              href={`/mi-diario/facturacion?nino=${n.id}`}
              className={`rounded-full px-3 py-1 text-sm ${
                n.id === nino.id ? 'bg-primary-soft text-primary' : 'text-muted-foreground'
              }`}
            >
              {n.nombre}
            </a>
          ))}
        </div>
      )}

      {(!cuotas || cuotas.length === 0) ? (
        <p className="mt-6 text-sm text-muted-foreground">Todavía no hay cuotas registradas.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {cuotas.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border px-4 py-3">
              <p className="text-sm font-medium">
                {ETIQUETA_CONCEPTO[c.concepto]} · {c.periodo}
                {c.importe != null && ` · ${c.importe}€`}
              </p>
              {c.descripcion && <p className="text-xs text-muted-foreground">{c.descripcion}</p>}
              <p className={`text-xs ${c.estado === 'pagado' ? 'text-alimentacion' : 'text-danger'}`}>
                {c.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
