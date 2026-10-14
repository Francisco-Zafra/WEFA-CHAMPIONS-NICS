import { LogIn, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useDraw } from '@/lib/draw'
import { useToast } from './Toast'
import { Wordmark } from './ui'

const ICON = {
  squad: (
    <>
      <rect x="3" y="4" width="11" height="15" rx="2" />
      <path d="M17 6.5l3 .8-3.2 12.3-6-1.6" />
    </>
  ),
  draw: (
    <path d="M3 7h3.5c2.5 0 3.8 1.3 5 3.5l1 2c1.2 2.2 2.5 3.5 5 3.5H21M18 13l3 3-3 3M18 4l3 3-3 3M21 7h-3.5c-1.3 0-2.2.3-3 .9M3 17h3.5c1.3 0 2.2-.3 3-.9" />
  ),
  board: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 12h16M9 3v3h6V3M9 21v-3h6v3" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  cup: (
    <>
      <path d="M3 5h5v5H3M3 14h5v5H3M8 7.5h3v9H8M11 12h3" />
      <rect x="14" y="9" width="7" height="6" rx="1.5" />
    </>
  ),
  history: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6" />
  ),
}

const NAV = [
  { to: '/', label: 'Plantilla', icon: ICON.squad },
  { to: '/sorteo', label: 'Sorteo', icon: ICON.draw },
  { to: '/pizarra', label: 'Pizarra', icon: ICON.board },
  { to: '/copa', label: 'Copa', icon: ICON.cup },
  { to: '/historial', label: 'Historial', icon: ICON.history },
]

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

function Floodlights() {
  return (
    <>
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
    </>
  )
}

/** Avatar de la sesión (móvil) o botón Entrar */
function AccountButton() {
  const { isAdmin, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  if (!isAdmin)
    return (
      <Link className="btn btn--white btn--sm h-11" to="/bienvenida">
        Entrar
      </Link>
    )
  return (
    <button
      className="avatar size-11 cursor-pointer border-0"
      style={{ boxShadow: '0 0 0 2px var(--club)' }}
      type="button"
      aria-label="Cerrar sesión de admin"
      title="Cerrar sesión"
      onClick={() =>
        void logout().then(() => {
          toast('Sesión cerrada', 'info')
          navigate('/')
        })
      }
    >
      AD
    </button>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { themeClub, setMode } = useDraw()
  const { isAdmin, logout } = useAuth()
  const toast = useToast()

  return (
    <div className={`club-${themeClub} grain relative min-h-dvh`}>
      <div className="app-bg atmosphere" aria-hidden />

      {/* Escritorio: rail lateral */}
      <nav className="rail hidden lg:flex" aria-label="Principal">
        <Link to="/" className="mx-1.5 mb-7">
          <Wordmark large />
        </Link>
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="rail__item">
            <NavIcon>{icon}</NavIcon>
            {label}
          </NavLink>
        ))}
        <div className="flex-1" />
        <Link
          className="btn btn--primary mb-4 h-[54px]"
          to="/sorteo"
          onClick={() => setMode('friendly')}
          title="Sorteo amistoso"
          style={{ fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '.06em', fontWeight: 400 }}
        >
          Nuevo sorteo
        </Link>
        <div className="flex items-center gap-2.5 border-t border-[var(--line)] px-2 pt-3">
          <span className="avatar" style={{ boxShadow: '0 0 0 2px var(--club)' }}>
            {isAdmin ? 'AD' : 'ES'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{isAdmin ? 'Admin' : 'Espectador'}</div>
            <div className="small text-xs">{isAdmin ? 'Puedes editar' : 'Solo lectura'}</div>
          </div>
          {isAdmin ? (
            <button
              className="btn btn--ghost btn--icon"
              type="button"
              aria-label="Cerrar sesión"
              onClick={() => void logout().then(() => toast('Sesión cerrada', 'info'))}
            >
              <LogOut />
            </button>
          ) : (
            <Link className="btn btn--ghost btn--icon" to="/bienvenida" aria-label="Entrar como admin">
              <LogIn />
            </Link>
          )}
        </div>
      </nav>

      {/* Móvil: barra superior */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-[18px] pt-[34px] pb-2 lg:hidden">
        <Floodlights />
        <Link to="/">
          <Wordmark />
        </Link>
        <AccountButton />
      </header>

      <main className="relative z-[1] mx-auto box-border max-w-[1240px] px-[18px] pt-2.5 pb-[120px] lg:ml-[248px] lg:px-10 lg:pt-11 lg:pb-12">
        {children}
      </main>

      {/* Móvil: tabbar flotante */}
      <nav className="tabbar lg:hidden" aria-label="Principal">
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="tab">
            <NavIcon>{icon}</NavIcon>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
