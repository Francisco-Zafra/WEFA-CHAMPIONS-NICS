import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { loginErrorMessage } from '@/lib/authErrors'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { Button } from './ui'

export function LoginSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Acceso admin">
      {open && <LoginForm onDone={onClose} />}
    </Sheet>
  )
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const { login } = useAuth()
  const toast = useToast()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="flex flex-col gap-4 pt-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
          await login(username, password)
          toast('¡Bienvenido al banquillo, míster!')
          onDone()
        } catch (err) {
          setError(loginErrorMessage(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <p className="text-muted text-sm">
        Sin sesión puedes ver todo y sortear. Para editar la plantilla y guardar partidos, entra como admin.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="label">Usuario</span>
        <input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border-line focus:border-accent h-12 rounded-xl border bg-white/5 px-4 outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">Contraseña</span>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-line focus:border-accent h-12 rounded-xl border bg-white/5 px-4 outline-none"
        />
      </label>
      {error && <p className="text-loss text-sm font-semibold">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy || !username || !password}>
        Entrar
      </Button>
    </form>
  )
}
