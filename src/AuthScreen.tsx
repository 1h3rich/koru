import { useState, type FormEvent } from 'react'
import { EyeIcon } from './Icons'
import { authenticateAndSync, InvalidPasswordError, requestPersistentStorage, type CloudSnapshot } from './storage'

interface AuthScreenProps {
  onAuthenticated: (snapshot: CloudSnapshot) => void
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      <span className="auth-background-mark" aria-hidden="true">K</span>
      <section className="auth-shell" aria-labelledby="auth-title">
        <h1 id="auth-title">Hola</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="password">Contraseña</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
            <button
              type="button"
              className="icon-button field-button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? 'Comprobando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
