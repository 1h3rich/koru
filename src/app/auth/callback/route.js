import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Adonde llega el usuario al pulsar el enlace magico del email.
// Acepta dos formatos, segun como se genero el enlace: "code" (el
// que recibe un usuario real via signInWithOtp desde el navegador,
// flujo PKCE) o "token_hash"+"type" (el que usa admin.generateLink,
// pensado para enlaces generados desde el servidor). Cualquiera de
// los dos deja una sesion real y manda a /inicio, que decide si es
// cuidadora/guarderia o padre.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/inicio`)
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}/inicio`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=enlace_invalido`)
}
