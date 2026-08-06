import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button, Cabecera, Field, Input, Mensaje, Select } from '@/components/ui'
import { BotonImprimir } from '@/components/BotonImprimir'
import { crearCuota, marcarCuota, borrarCuota } from './actions'

const ETIQUETA_CONCEPTO = {
  mensualidad: 'Mensualidad',
  comedor: 'Comedor',
  horas_extra: 'Horas extra',
  material: 'Material escolar',
  otro: 'Otro',
}

const MENSAJES_ERROR = {
  datos_invalidos: 'Elige un concepto y escribe el periodo (ej. 2026-08).',
}

export default async function FacturacionNinoPage({ params, searchParams }) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: nino } = await supabase
    .from('ninos')
    .select('id, nombre, apellido_inicial')
    .eq('id', id)
    .maybeSingle()

  if (!nino) {
    notFound()
  }

  const { data: cuotas } = await supabase
    .from('cuotas')
    .select('id, concepto, descripcion, periodo, importe, estado')
    .eq('nino_id', id)
    .order('periodo', { ascending: false })

  const pendiente = (cuotas ?? []).filter((c) => c.estado === 'pendiente')

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Cabecera
        volver={`/panel/ninos/${nino.id}`}
        titulo={`💳 Facturación · ${nino.nombre} ${nino.apellido_inicial}.`}
        accion={<BotonImprimir />}
      />

      <p className="mb-6 text-xs text-muted-foreground print:hidden">
        Solo un registro de estados (pagado/pendiente) para llevar la cuenta — Koru no procesa
        pagos reales ni guarda datos financieros.
      </p>

      {pendiente.length > 0 && (
        <div className="mb-6 rounded-2xl border border-danger bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">
            {pendiente.length} {pendiente.length === 1 ? 'cuota pendiente' : 'cuotas pendientes'}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {(cuotas ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">
                {ETIQUETA_CONCEPTO[c.concepto]} · {c.periodo}
                {c.importe != null && ` · ${c.importe}€`}
              </p>
              {c.descripcion && <p className="text-xs text-muted-foreground">{c.descripcion}</p>}
              <p className={`text-xs ${c.estado === 'pagado' ? 'text-alimentacion' : 'text-danger'}`}>
                {c.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}
              </p>
            </div>
            <div className="flex gap-1 print:hidden">
              <form action={marcarCuota}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="nino_id" value={nino.id} />
                <input type="hidden" name="estado" value={c.estado === 'pagado' ? 'pendiente' : 'pagado'} />
                <Button type="submit" variant="secondary" className="text-xs">
                  {c.estado === 'pagado' ? 'Marcar pendiente' : 'Marcar pagado'}
                </Button>
              </form>
              <form action={borrarCuota}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="nino_id" value={nino.id} />
                <Button type="submit" variant="ghost" className="text-xs">
                  Quitar
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action={crearCuota} className="mt-6 space-y-3 rounded-2xl border border-border p-4 print:hidden">
        <p className="text-sm font-medium">Añadir cuota</p>
        <div className="flex gap-3">
          <div className="w-40">
            <Field label="Concepto">
              <Select name="concepto" required defaultValue="mensualidad">
                {Object.entries(ETIQUETA_CONCEPTO).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-32">
            <Field label="Periodo">
              <Input name="periodo" required placeholder="2026-08" />
            </Field>
          </div>
          <div className="w-28">
            <Field label="Importe (€)">
              <Input type="number" step="0.01" name="importe" placeholder="Opcional" />
            </Field>
          </div>
        </div>
        <Field label="Descripción (opcional)">
          <Input name="descripcion" placeholder="Ej: Cuota de septiembre" />
        </Field>
        <Button type="submit" className="w-full">
          Añadir
        </Button>
        <Mensaje tipo="error">{MENSAJES_ERROR[error]}</Mensaje>
      </form>
    </main>
  )
}
