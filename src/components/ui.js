import Link from 'next/link'

const VARIANTES = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-muted text-foreground hover:bg-border',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'text-muted-foreground underline hover:text-foreground',
}

const BASE_BOTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100'

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button className={`${BASE_BOTON} ${VARIANTES[variant]} ${className}`} {...props} />
  )
}

export function BotonEnlace({ href, variant = 'primary', className = '', children }) {
  return (
    <Link href={href} className={`${BASE_BOTON} ${VARIANTES[variant]} ${className}`}>
      {children}
    </Link>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors focus:outline-2 focus:outline-primary ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors focus:outline-2 focus:outline-primary ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`min-h-11 w-full rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground transition-colors focus:outline-2 focus:outline-primary ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function Card({ className = '', children }) {
  return (
    <div className={`sombra-suave rounded-3xl border border-border bg-background p-4 ${className}`}>
      {children}
    </div>
  )
}

export function Mensaje({ tipo = 'error', children }) {
  if (!children) return null
  const estilos = tipo === 'error' ? 'bg-danger/10 text-danger' : 'bg-primary-soft text-primary'
  return (
    <p className={`animate-[entrar_0.2s_ease-out] rounded-2xl px-4 py-3 text-sm ${estilos}`}>
      {children}
    </p>
  )
}

export function Cabecera({ titulo, subtitulo, volver, accion }) {
  return (
    <div className="mb-6">
      {volver && (
        <Link href={volver} className="mb-2 inline-block text-sm text-muted-foreground underline">
          Volver
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-sm text-muted-foreground">{subtitulo}</p>}
        </div>
        {accion}
      </div>
    </div>
  )
}
