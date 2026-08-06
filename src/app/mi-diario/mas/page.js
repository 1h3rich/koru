import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cerrarSesion } from '@/app/acciones'
import { generarQrDataUrl } from '@/lib/qr'
import { Button, Field, Input, Mensaje } from '@/components/ui'
import { SelectorTema } from '@/components/SelectorTema'
import { guardarTelefonoEmergencia, generarCodigoQr } from './actions'

export default async function MasPage({ searchParams }) {
  const { contacto_guardado, guardado } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: ninos }, { data: qrToken }] = await Promise.all([
    supabase
      .from('ninos')
      .select('id, nombre, nino_padre!inner(telefono_emergencia)')
      .eq('nino_padre.padre_id', user.id)
      .order('nombre'),
    supabase.from('qr_checkin_tokens').select('token').eq('padre_id', user.id).maybeSingle(),
  ])

  const qrDataUrl = qrToken
    ? await generarQrDataUrl(
        `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/panel/checkin/${qrToken.token}`
      )
    : null

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">Más</h1>

      <ul className="mt-6 space-y-2">
        <li>
          <Link
            href="/mi-diario/horario"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            🗓️ Horario semanal
          </Link>
        </li>
        <li>
          <Link
            href="/mi-diario/facturacion"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            💳 Facturación
          </Link>
        </li>
        <li>
          <Link
            href="/mi-diario/documentos"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            📚 Biblioteca documental
          </Link>
        </li>
        <li>
          <Link
            href="/mi-diario/menu"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            🍽️ Menú semanal
          </Link>
        </li>
        <li>
          <Link
            href="/acerca-de"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            ℹ️ Acerca de Koru
          </Link>
        </li>
        <li>
          <Link
            href="/creditos"
            className="sombra-suave block rounded-2xl border border-border px-4 py-3 text-sm"
          >
            Créditos de los iconos
          </Link>
        </li>
        <li className="sombra-suave rounded-2xl border border-border px-4 py-3 text-sm text-muted-foreground">
          📷 Galería de fotos — próximamente
        </li>
      </ul>

      {ninos && ninos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">📞 Contacto rápido</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Un teléfono al que la cuidadora pueda llamarte directamente en una emergencia, sin
            tener que buscarlo. Es opcional y puedes borrarlo cuando quieras.
          </p>
          {contacto_guardado && (
            <div className="mt-2">
              <Mensaje tipo="exito">Guardado.</Mensaje>
            </div>
          )}
          <div className="mt-3 space-y-3">
            {ninos.map((nino) => (
              <form
                key={nino.id}
                action={guardarTelefonoEmergencia}
                className="flex items-end gap-2 rounded-2xl border border-border p-3"
              >
                <input type="hidden" name="nino_id" value={nino.id} />
                <Field label={`Para ${nino.nombre}`}>
                  <Input
                    type="tel"
                    name="telefono_emergencia"
                    defaultValue={nino.nino_padre[0]?.telefono_emergencia ?? ''}
                    placeholder="Ej: 600 000 000"
                  />
                </Field>
                <Button type="submit" variant="secondary">
                  Guardar
                </Button>
              </form>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">📷 Código QR de entrada/salida</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Enséñaselo a la cuidadora — al escanearlo con la cámara del móvil marca la entrada o
          salida de tus niños al instante, sin escribir nada.
        </p>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Tu código QR de entrada/salida" className="mt-3 rounded-2xl" width={240} height={240} />
        ) : (
          <form action={generarCodigoQr} className="mt-3">
            <Button type="submit">Generar mi código QR</Button>
          </form>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">🌗 Tema</h2>
        {guardado && (
          <div className="mt-2">
            <Mensaje tipo="exito">Guardado.</Mensaje>
          </div>
        )}
        <SelectorTema destino="/mi-diario/mas" />
      </div>

      <form action={cerrarSesion} className="mt-6">
        <Button variant="secondary" type="submit" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </main>
  )
}
