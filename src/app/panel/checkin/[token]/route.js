import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Se llega aquí abriendo el QR con la cámara del móvil, no
// navegando dentro de la app — por eso es un Route Handler (GET que
// hace la escritura) y no una Server Action, que necesitaría un
// <form> ya abierto en la página. Nunca enlazar a esto con <Link>
// dentro de la app: el prefetch de Next dispararía el check-in solo,
// como aviso, con el enlace en el viewport.
export async function GET(request, { params }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const admin = createAdminClient()
  const { data: tokenRow } = await admin
    .from('qr_checkin_tokens')
    .select('padre_id')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) {
    return NextResponse.redirect(new URL('/panel/checkin?error=token_invalido', request.url))
  }

  // La RLS de nino_padre/ninos ya limita esto a los ninos de la
  // cuenta de la cuidadora logueada: si el padre no tiene ningun
  // nino en esta cuenta, sale vacio, no hace falta comprobarlo aparte.
  const { data: vinculos } = await supabase
    .from('nino_padre')
    .select('nino_id')
    .eq('padre_id', tokenRow.padre_id)

  const ninoIds = (vinculos ?? []).map((v) => v.nino_id)
  if (ninoIds.length === 0) {
    return NextResponse.redirect(new URL('/panel/checkin?error=sin_ninos', request.url))
  }

  const { data: ninos } = await supabase
    .from('ninos')
    .select('id, nombre')
    .in('id', ninoIds)
    .eq('activo', true)

  const fecha = new Date().toISOString().slice(0, 10)
  const hora = new Date().toTimeString().slice(0, 5)

  const resultados = []
  for (const nino of ninos ?? []) {
    const { data: asistencia } = await supabase
      .from('asistencia')
      .select('hora_entrada, hora_salida')
      .eq('nino_id', nino.id)
      .eq('fecha', fecha)
      .maybeSingle()

    let accion
    if (!asistencia?.hora_entrada) {
      await supabase
        .from('asistencia')
        .upsert({ nino_id: nino.id, fecha, hora_entrada: hora, creado_por: user.id }, { onConflict: 'nino_id,fecha' })
      accion = { tipo: 'entrada', hora }
    } else if (!asistencia.hora_salida) {
      await supabase
        .from('asistencia')
        .upsert({ nino_id: nino.id, fecha, hora_salida: hora, creado_por: user.id }, { onConflict: 'nino_id,fecha' })
      accion = { tipo: 'salida', hora }
    } else {
      accion = { tipo: 'completo' }
    }
    resultados.push({ nombre: nino.nombre, ...accion })
  }

  const query = new URLSearchParams({ r: encodeURIComponent(JSON.stringify(resultados)) })
  return NextResponse.redirect(new URL(`/panel/checkin?${query}`, request.url))
}
