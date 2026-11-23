import { useState, type FormEvent } from 'react'
import { EyeIcon, LockIcon, ShieldIcon } from './Icons'
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
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <section className="auth-shell" aria-labelledby="auth-title">
        <div className="auth-story">
          <a className="brand brand-light" href="/" aria-label="Koru, inicio">
            <span className="brand-mark">K</span>
            <span>Koru</span>
          </a>
          <div className="auth-story-copy">
            <p className="eyebrow">Tu dinero, cifrado</p>
            <h1 id="auth-title">Claridad financiera, estés donde estés.</h1>
            <p>Registra lo que entra y lo que sale. Koru cifra todo antes de sincronizarlo.</p>
          </div>
          <div className="privacy-note">
            <ShieldIcon />
            <span>Cifrado en tu dispositivo · Sin seguimiento</span>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-icon"><LockIcon /></div>
            <p className="eyebrow eyebrow-blue">Acceso privado</p>
            <h2>Qué bueno verte</h2>
            <p className="auth-intro">Introduce tu contraseña para abrir tu espacio privado.</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label htmlFor="password">Contraseña</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
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
                <LockIcon />
                {loading ? 'Comprobando…' : 'Entrar en Koru'}
              </button>
            </form>

            <p className="local-footnote">
              La contraseña descifra tus datos; Koru nunca guarda una copia legible.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
