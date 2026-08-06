'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enviarEmail } from '@/lib/email'
import { subirFoto } from '@/lib/fotos'
import { padresDe } from '@/lib/notificaciones'

const ETIQUETA_COMIDA = { bien: 'Comió bien', regular: 'Comió regular', nada: 'No comió' }
const ETIQUETA_SIESTA = { bien: 'Durmió bien', poco: 'Durmió poco', nada: 'No durmió' }
const ETIQUETA_ANIMO = { contento: 'Feliz 😊', tranquilo: 'Tranquilo 😌', inquieto: 'Inquieto 😕', triste: 'Triste 😢' }

function vacioANulo(valor) {
  const texto = valor?.toString().trim()
  return texto ? texto : null
}

async function notificarEntrada(nino_id, hora_entrada, quien_entrega) {
  const info = await padresDe(nino_id)
  if (!info) return

  const html = `
    <p>👋 <strong>${info.nombreNino}</strong> ha llegado a las ${hora_entrada.slice(0, 5)}${
      quien_entrega ? ` (le ha traído ${quien_entrega})` : ''
    }.</p>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/mi-diario">Ver en Koru</a></p>
  `

  await Promise.all(
    info.emails.map((email) =>
      enviarEmail({ to: email, subject: `${info.nombreNino} ya ha llegado`, html })
    )
  )
}

async function notificarAccidente(nino_id, descripcion) {
  const info = await padresDe(nino_id)
  if (!info) return

  const html = `
    <p>🩹 Se ha registrado una incidencia con <strong>${info.nombreNino}</strong> hoy:</p>
    <p>${descripcion}</p>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/mi-diario">Ver en Koru</a></p>
  `

  await Promise.all(
    info.emails.map((email) =>
      enviarEmail({ to: email, subject: `Incidencia con ${info.nombreNino} hoy`, html })
    )
  )
}

async function notificarResumenDia(nino_id, registro, hora_salida, quien_recoge) {
  const info = await padresDe(nino_id)
  if (!info) return

  const lineas = [
    registro.comida && `🍽️ ${ETIQUETA_COMIDA[registro.comida]}`,
    registro.temperatura && `🌡️ ${registro.temperatura}°C`,
    registro.siesta && `🌙 ${ETIQUETA_SIESTA[registro.siesta]}`,
    registro.estado_animo && `${ETIQUETA_ANIMO[registro.estado_animo]}`,
    registro.actividad && `🎨 ${registro.actividad}`,
    hora_salida && `🚶 Salida ${hora_salida.slice(0, 5)}${quien_recoge ? ` · ${quien_recoge}` : ''}`,
  ].filter(Boolean)
  if (lineas.length === 0) return

  const html = `
    <p>Resumen del día de <strong>${info.nombreNino}</strong>:</p>
    <ul>${lineas.map((l) => `<li>${l}</li>`).join('')}</ul>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/mi-diario">Ver en Koru</a></p>
  `

  await Promise.all(
    info.emails.map((email) =>
      enviarEmail({ to: email, subject: `Resumen del día de ${info.nombreNino}`, html })
    )
  )
}

// Paso 1 del día: se registra en el momento en que el niño llega,
// no al final del día. Toca solo las columnas de entrada en
// "asistencia" — un upsert parcial no pisa hora_salida/quien_recoge
// si ya existian (p. ej. al corregir la hora de entrada mas tarde).
export async function registrarEntrada(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const fecha = formData.get('fecha')?.toString()
  const hora_entrada = formData.get('hora_entrada')?.toString()
  if (!nino_id || !fecha) {
    redirect('/panel')
  }
  if (!hora_entrada) {
    redirect(`/panel/ninos/${nino_id}/hoy?error=falta_hora`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const quien_entrega = vacioANulo(formData.get('quien_entrega'))

  const { error } = await supabase.from('asistencia').upsert(
    { nino_id, fecha, hora_entrada, quien_entrega, creado_por: user.id },
    { onConflict: 'nino_id,fecha' }
  )

  if (error) {
    redirect(`/panel/ninos/${nino_id}/hoy?error=no_se_pudo_guardar`)
  }

  await notificarEntrada(nino_id, hora_entrada, quien_entrega)

  redirect(`/panel/ninos/${nino_id}/hoy`)
}

// Un accidente puede pasar en cualquier momento del dia, no solo al
// recoger -- por eso es una accion aparte del resto del dia (paso 2),
// que solo se rellena en la salida. Notifica de inmediato, no espera
// al resumen de la tarde.
export async function reportarAccidente(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const fecha = formData.get('fecha')?.toString()
  const descripcion = vacioANulo(formData.get('accidente_descripcion'))
  if (!nino_id || !fecha) {
    redirect('/panel')
  }
  if (!descripcion) {
    redirect(`/panel/ninos/${nino_id}/hoy?error=falta_descripcion_accidente`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('registros_diarios').upsert(
    { nino_id, fecha, accidente: true, accidente_descripcion: descripcion, creado_por: user.id },
    { onConflict: 'nino_id,fecha' }
  )

  if (error) {
    redirect(`/panel/ninos/${nino_id}/hoy?error=no_se_pudo_guardar`)
  }

  await notificarAccidente(nino_id, descripcion)

  redirect(`/panel/ninos/${nino_id}/hoy`)
}

// Un hito es un momento suelto con hora exacta (desayuno 08:30,
// juegos 09:10...), ADEMAS del resumen del dia, no en su lugar --
// el resumen sigue siendo el flujo por defecto de <1 minuto. Sin
// notificacion propia: no son tan urgentes como un accidente, ya se
// ven en el resumen del dia o en la propia linea temporal.
export async function anadirHito(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const fecha = formData.get('fecha')?.toString()
  const hora = formData.get('hora')?.toString()
  const descripcion = vacioANulo(formData.get('descripcion'))
  if (!nino_id || !fecha) {
    redirect('/panel')
  }
  if (!hora || !descripcion) {
    redirect(`/panel/ninos/${nino_id}/hoy?error=falta_hito`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('hitos_dia')
    .insert({ nino_id, fecha, hora, descripcion, creado_por: user.id })

  if (error) {
    redirect(`/panel/ninos/${nino_id}/hoy?error=no_se_pudo_guardar`)
  }

  redirect(`/panel/ninos/${nino_id}/hoy`)
}

export async function borrarHito(formData) {
  const id = formData.get('id')?.toString()
  const nino_id = formData.get('nino_id')?.toString()
  const supabase = await createClient()
  await supabase.from('hitos_dia').delete().eq('id', id)
  redirect(`/panel/ninos/${nino_id}/hoy`)
}

// Paso 2 del día: como ha ido (comida/siesta/animo/notas) y la
// salida, se registra cuando lo recogen — no antes, porque hasta
// entonces no se sabe como ha ido el dia. Esta pantalla ya muestra
// tambien la entrada (por si hay que corregirla), asi que aqui se
// escribe la fila de asistencia completa.
export async function guardarRestoDia(formData) {
  const nino_id = formData.get('nino_id')?.toString()
  const fecha = formData.get('fecha')?.toString()
  if (!nino_id || !fecha) {
    redirect('/panel')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  let foto_url
  const foto = formData.get('foto')
  if (foto && foto.size > 0) {
    try {
      foto_url = await subirFoto(supabase, nino_id, fecha, foto)
    } catch {
      redirect(`/panel/ninos/${nino_id}/hoy?error=no_se_pudo_guardar`)
    }
  }

  const temperaturaTexto = vacioANulo(formData.get('temperatura'))

  const registro = {
    nino_id,
    fecha,
    comida: vacioANulo(formData.get('comida')),
    cantidad_comida: vacioANulo(formData.get('cantidad_comida')),
    siesta: vacioANulo(formData.get('siesta')),
    panal_cambiado: formData.get('panal_cambiado') === 'on',
    panal_bano: vacioANulo(formData.get('panal_bano')),
    temperatura: temperaturaTexto ? Number(temperaturaTexto) : null,
    estado_animo: vacioANulo(formData.get('estado_animo')),
    actividad: vacioANulo(formData.get('actividad')),
    ...(foto_url ? { foto_url } : {}),
    creado_por: user.id,
  }

  const hora_entrada = vacioANulo(formData.get('hora_entrada'))
  const quien_entrega = vacioANulo(formData.get('quien_entrega'))
  const hora_salida = vacioANulo(formData.get('hora_salida'))
  const quien_recoge = vacioANulo(formData.get('quien_recoge'))

  const [registroResultado, asistenciaResultado] = await Promise.all([
    supabase.from('registros_diarios').upsert(registro, { onConflict: 'nino_id,fecha' }),
    supabase
      .from('asistencia')
      .upsert(
        { nino_id, fecha, hora_entrada, quien_entrega, hora_salida, quien_recoge, creado_por: user.id },
        { onConflict: 'nino_id,fecha' }
      ),
  ])

  if (registroResultado.error || asistenciaResultado.error) {
    redirect(`/panel/ninos/${nino_id}/hoy?error=no_se_pudo_guardar`)
  }

  await notificarResumenDia(nino_id, registro, hora_salida, quien_recoge)

  redirect(`/panel/ninos/${nino_id}?guardado=1`)
}
