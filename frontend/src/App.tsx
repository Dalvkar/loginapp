import { FormEvent, useEffect, useId, useState } from 'react'
import { ApiError, getCurrentUser, login, logout, type User } from './api'
import './styles.css'

type FieldErrors = Partial<Record<'email' | 'password', string>>

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Revisa los datos ingresados.'
    if (error.status === 401) return 'El correo o la contraseña no coinciden.'
    if (error.status === 429) return 'Demasiados intentos. Espera un momento antes de volver a intentar.'
    return error.message
  }
  return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) errors.email = 'Ingresa tu correo electrónico.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Ingresa un correo válido.'
  if (!password) errors.password = 'Ingresa tu contraseña.'
  return errors
}

export default function App() {
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (active) setNotice(friendlyError(error))
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(email, password)
    setErrors(nextErrors)
    setNotice('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const authenticatedUser = await login(email.trim(), password)
      setUser(authenticatedUser)
      setPassword('')
    } catch (error) {
      setNotice(friendlyError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    setNotice('')
    setLoggingOut(true)
    try {
      await logout()
      setUser(null)
      setEmail('')
      setPassword('')
    } catch (error) {
      setNotice(friendlyError(error))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <main className="shell">
      <section className="story" aria-labelledby="brand-heading">
        <a className="brand" href="/" aria-label="Umbral, inicio">
          <span className="brand-mark" aria-hidden="true">U</span>
          Umbral
        </a>
        <div className="story-copy">
          <p className="eyebrow">TU ESPACIO, A TU RITMO</p>
          <h1 id="brand-heading">Todo lo importante,<br />en un solo lugar.</h1>
          <p className="lede">Entra a tu cuenta y retoma justo donde lo dejaste. Seguro, simple y sin distracciones.</p>
        </div>
        <p className="security-note"><span aria-hidden="true">✦</span> Tu sesión está protegida de principio a fin.</p>
      </section>

      <section className="account-panel" aria-label="Acceso a la cuenta">
        {checkingSession ? (
          <div className="status-card" role="status" aria-live="polite">
            <span className="spinner large" aria-hidden="true" />
            <h2>Preparando tu espacio</h2>
            <p>Estamos comprobando tu sesión.</p>
          </div>
        ) : user ? (
          <div className="session-card">
            <div className="avatar" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</div>
            <p className="eyebrow">SESIÓN ACTIVA</p>
            <h2>Qué bueno verte.</h2>
            <p className="session-email">{user.email}</p>
            <p className="muted">Tu cuenta está conectada de forma segura.</p>
            {notice && <div className="alert" role="alert">{notice}</div>}
            <button className="secondary-button" type="button" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut && <span className="spinner" aria-hidden="true" />}
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
        ) : (
          <div className="login-card">
            <div className="form-heading">
              <p className="eyebrow">BIENVENIDO DE NUEVO</p>
              <h2>Inicia sesión</h2>
              <p>Usa tus credenciales para continuar.</p>
            </div>

            {notice && <div className="alert" role="alert">{notice}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor={emailId}>Correo electrónico</label>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  value={email}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${emailId}-error` : undefined}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (errors.email) setErrors((current) => ({ ...current, email: undefined }))
                  }}
                />
                {errors.email && <p className="field-error" id={`${emailId}-error`}>{errors.email}</p>}
              </div>

              <div className="field">
                <div className="label-row">
                  <label htmlFor={passwordId}>Contraseña</label>
                </div>
                <div className="password-wrap">
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={password}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? `${passwordId}-error` : undefined}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (errors.password) setErrors((current) => ({ ...current, password: undefined }))
                    }}
                  />
                  <button
                    className="reveal-button"
                    type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {errors.password && <p className="field-error" id={`${passwordId}-error`}>{errors.password}</p>}
              </div>

              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting && <span className="spinner" aria-hidden="true" />}
                {submitting ? 'Entrando…' : 'Entrar a mi cuenta'}
              </button>
            </form>
            <p className="privacy">Al continuar, tus datos se enviarán mediante una conexión segura.</p>
          </div>
        )}
      </section>
    </main>
  )
}
