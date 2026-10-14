import { Eye, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import { ShieldMark } from '@/components/ui'
import { CLUBS } from '@/domain/clubs'
import { useAuth } from '@/lib/auth'
import { loginErrorMessage } from '@/lib/authErrors'
import { markWelcomed } from '@/lib/welcome'

/** Escudos en órbita alrededor del logo (posiciones del diseño, en un lienzo de 342×380) */
const ORBIT = [
  [142, 33],
  [232, 70],
  [270, 161],
  [232, 251],
  [142, 289],
  [52, 251],
  [14, 161],
  [52, 70],
] as const

export function WelcomePage() {
  const { login, isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function enter() {
    markWelcomed()
    navigate('/', { replace: true })
  }

  return (
    <div className="club-wefa grain relative min-h-dvh overflow-hidden">
      <div className="app-bg atmosphere" aria-hidden />
      <div className="relative z-[1] mx-auto flex min-h-dvh max-w-[420px] flex-col px-6 pt-[18px] pb-[max(34px,env(safe-area-inset-bottom))]">
        <div className="floodlights" style={{ left: 18 }} aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="floodlights" style={{ right: 18 }} aria-hidden>
          <i />
          <i />
          <i />
        </div>

        <div
          className="relative mx-auto mt-6 h-[380px] w-[342px] max-w-full origin-top scale-[0.9] sm:scale-100"
          aria-hidden
        >
          <div className="halo" style={{ width: 260, height: 260, left: 41, top: 60 }} />
          <div
            className="absolute rounded-full"
            style={{ left: 43, top: 62, width: 256, height: 256, border: '1px dashed rgba(170,190,255,.22)' }}
          />
          <ShieldMark
            className="absolute"
            style={{
              left: 116,
              top: 135,
              width: 110,
              height: 110,
              color: 'var(--club)',
              filter: 'drop-shadow(0 0 22px var(--club))',
            }}
          />
          {CLUBS.map((c, i) => (
            <div
              key={c.id}
              className={`crest crest--${c.id} orb`}
              style={{ left: ORBIT[i]![0], top: ORBIT[i]![1], animationDelay: `${0.05 + i * 0.07}s` }}
            />
          ))}
        </div>

        <div className="-mt-6 flex flex-col items-center gap-3 text-center sm:mt-2">
          <p className="eyebrow">Fútbol entre amigos</p>
          <h1 className="h-display text-[56px] sm:text-[64px]">
            WEFA Champions <span className="neon">NICS</span>
          </h1>
          <p className="body-text max-w-[300px]">
            Tu plantilla en cartas, dos equipos equilibrados en un toque y el historial de cada noche.
          </p>
        </div>

        <div className="min-h-6 flex-1" />

        {isAdmin ? (
          <button className="btn btn--primary h-14 rounded-2xl text-base" type="button" onClick={enter}>
            Entrar al estadio
          </button>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError(null)
              try {
                await login(username, password)
                toast('¡Bienvenido al banquillo, míster!')
                enter()
              } catch (err) {
                setError(loginErrorMessage(err))
                setBusy(false)
              }
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="field">
                <label htmlFor="login-user">Usuario</label>
                <input
                  id="login-user"
                  className="input"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="login-pass">Contraseña</label>
                <input
                  id="login-pass"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm font-semibold text-[#ff9aa5]">{error}</p>}
            <button
              className="btn btn--white h-14 rounded-2xl text-base"
              type="submit"
              disabled={busy || !username || !password}
            >
              {busy ? <span className="spinner" /> : <LogIn />}
              Entrar como admin
            </button>
            <button className="btn btn--glass h-[52px]" type="button" onClick={enter}>
              <Eye />
              Entrar como espectador
            </button>
            <p className="small mt-1 text-center">
              Sin sesión puedes ver la plantilla, la pizarra, la copa y el historial. Para sortear, editar y
              guardar partidos, entra como admin.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
