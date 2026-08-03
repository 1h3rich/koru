'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Mensaje } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState('inicial') // inicial | enviando | enviado | error

  async function enviarEnlace(e) {
    e.preventDefault()
    setEstado('enviando')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setEstado(error ? 'error' : 'enviado')
  }

  if (estado === 'enviado') {
    return (
      <main className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl">📬</div>
        <h1 className="mt-3 text-xl font-semibold">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te hemos enviado un enlace a <strong>{email}</strong> para entrar en Koru.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <p className="text-2xl">🌿</p>
        <h1 className="mt-2 text-2xl font-semibold">Koru</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El diario de tu peque, sin WhatsApp.
        </p>
      </div>
      <form onSubmit={enviarEnlace} className="space-y-3">
        <Input
          type="email"
          required
          aria-label="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          autoFocus
        />
        <Button type="submit" disabled={estado === 'enviando'} className="w-full">
          {estado === 'enviando' ? 'Enviando...' : 'Enviarme el enlace'}
        </Button>
        {estado === 'error' && (
          <Mensaje tipo="error">No hemos podido enviar el enlace. Inténtalo de nuevo.</Mensaje>
        )}
      </form>
    </main>
  )
}
