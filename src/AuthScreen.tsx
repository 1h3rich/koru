import { useState, type FormEvent } from 'react'
import { authenticateAndSync, InvalidPasswordError, requestPersistentStorage, type CloudSnapshot } from './storage'

interface AuthScreenProps {
  onAuthenticated: (snapshot: CloudSnapshot) => void
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    setLoading(true)
    try {
      const snapshot = await authenticateAndSync(password)
      await requestPersistentStorage()
      onAuthenticated(snapshot)
    } catch (submitError) {
      setError(submitError instanceof InvalidPasswordError
        ? 'La contraseña no es correcta. Inténtalo de nuevo.'
        : 'No se pudo conectar con Koru. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label="Acceso a Koru">
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            id="password"
            type="password"
            aria-label="Contraseña"
            placeholder="Contraseña"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? 'Comprobando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
