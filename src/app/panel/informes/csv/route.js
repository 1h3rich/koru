import { createClient } from '@/lib/supabase/server'
import { aCsv } from '@/lib/csv'

const ETIQUETA_ESTADO_ASISTENCIA = {
  presente: 'Presente',
  ausente_justificado: 'Ausencia justificada',
  vacaciones: 'Vacaciones',
}

const ETIQUETA_AREA = {
  motricidad: 'Motricidad',
  lenguaje: 'Lenguaje',
  socializacion: 'Socialización',
  creatividad: 'Creatividad',
  autonomia: 'Autonomía',
}

function nombreNino(nino) {
  return `${nino?.nombre ?? ''} ${nino?.apellido_inicial ?? ''}`.trim()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('No autorizado', { status: 401 })
  }

  let csv
  let nombreArchivo

  if (tipo === 'asistencia') {
    const { data } = await supabase
      .from('asistencia')
      .select('fecha, hora_entrada, hora_salida, estado, ninos(nombre, apellido_inicial)')
      .order('fecha', { ascending: false })

    csv = aCsv(
      (data ?? []).map((a) => ({
        nino: nombreNino(a.ninos),
        fecha: a.fecha,
        hora_entrada: a.hora_entrada ?? '',
        hora_salida: a.hora_salida ?? '',
        estado: ETIQUETA_ESTADO_ASISTENCIA[a.estado] ?? a.estado,
      })),
      [
        { clave: 'nino', etiqueta: 'Niño' },
        { clave: 'fecha', etiqueta: 'Fecha' },
        { clave: 'hora_entrada', etiqueta: 'Hora entrada' },
        { clave: 'hora_salida', etiqueta: 'Hora salida' },
        { clave: 'estado', etiqueta: 'Estado' },
      ]
    )
    nombreArchivo = 'asistencia.csv'
  } else if (tipo === 'pagos') {
    const { data } = await supabase
      .from('cuotas')
      .select('concepto, descripcion, periodo, importe, estado, ninos(nombre, apellido_inicial)')
      .order('periodo', { ascending: false })

    csv = aCsv(
      (data ?? []).map((c) => ({
        nino: nombreNino(c.ninos),
        concepto: c.concepto,
        descripcion: c.descripcion ?? '',
        periodo: c.periodo,
        importe: c.importe ?? '',
        estado: c.estado === 'pagado' ? 'Pagado' : 'Pendiente',
      })),
      [
        { clave: 'nino', etiqueta: 'Niño' },
        { clave: 'concepto', etiqueta: 'Concepto' },
        { clave: 'descripcion', etiqueta: 'Descripción' },
        { clave: 'periodo', etiqueta: 'Periodo' },
        { clave: 'importe', etiqueta: 'Importe (€)' },
        { clave: 'estado', etiqueta: 'Estado' },
      ]
    )
    nombreArchivo = 'pagos.csv'
  } else if (tipo === 'evolucion') {
    const { data } = await supabase
      .from('observaciones_desarrollo')
      .select('area, fecha, texto, ninos(nombre, apellido_inicial)')
      .order('fecha', { ascending: false })

    csv = aCsv(
      (data ?? []).map((o) => ({
        nino: nombreNino(o.ninos),
        area: ETIQUETA_AREA[o.area] ?? o.area,
        fecha: o.fecha,
        texto: o.texto,
      })),
      [
        { clave: 'nino', etiqueta: 'Niño' },
        { clave: 'area', etiqueta: 'Área' },
        { clave: 'fecha', etiqueta: 'Fecha' },
        { clave: 'texto', etiqueta: 'Observación' },
      ]
    )
    nombreArchivo = 'evolucion.csv'
  } else {
    return new Response('Tipo de informe no válido', { status: 400 })
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  })
}
