import { LogIn, LogOut, Shuffle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useDraw } from '@/lib/draw'
import { useToast } from './Toast'
import { Wordmark } from './ui'

const ICON = {
  home: <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />,
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
  cup: <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6" />,
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  stats: <path d="M5 20v-8M12 20V5M19 20v-5" strokeWidth="2" />,
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Otras rutas en las que esta entrada cuenta como activa */
  also?: string[]
  adminOnly?: boolean
}

/** Menú lateral en dos grupos: lo que se usa para preparar y jugar, y lo que se consulta después */
const WEEK: NavItem[] = [
  { to: '/', label: 'Inicio', icon: ICON.home },
  { to: '/plantilla', label: 'Plantilla', icon: ICON.squad },
  { to: '/sorteo', label: 'Sorteo', icon: ICON.draw, adminOnly: true },
  { to: '/pizarra', label: 'Pizarra', icon: ICON.board },
  { to: '/copa', label: 'Copa', icon: ICON.cup },
]
const DATA: NavItem[] = [
  { to: '/historial', label: 'Historial', icon: ICON.history },
  { to: '/estadisticas', label: 'Estadísticas', icon: ICON.stats, also: ['/jugador'] },
]
/** Móvil: seis iconos (el sorteo, para el admin, va en la cabecera) */
const MOBILE = [...WEEK.filter((n) => n.to !== '/sorteo'), ...DATA]

function isActive(item: NavItem, path: string) {
  if (item.to === '/') return path === '/'
  return [item.to, ...(item.also ?? [])].some((p) => path === p || path.startsWith(`${p}/`))
}

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
  const { setMode } = useDraw()
  const { isAdmin, logout } = useAuth()
  const toast = useToast()
  const { pathname } = useLocation()
  const railItem = (item: NavItem) =>
    (!item.adminOnly || isAdmin) && (
      <Link
        key={item.to}
        to={item.to}
        className="rail__item"
        aria-current={isActive(item, pathname) ? 'page' : undefined}
      >
        <NavIcon>{item.icon}</NavIcon>
        {item.label}
      </Link>
    )

  return (
    <div className="club-wefa grain relative min-h-dvh">
      <div className="app-bg atmosphere" aria-hidden />

      {/* Escritorio: rail lateral */}
      <nav className="rail hidden lg:flex" aria-label="Principal">
        <Link to="/" className="mx-1.5 mb-3">
          <Wordmark large />
        </Link>
        <span className="railgroup">La semana</span>
        {WEEK.map(railItem)}
        <span className="railgroup">Los datos</span>
        {DATA.map(railItem)}
        <div className="flex-1" />
        {isAdmin && (
          <Link
            className="btn btn--primary mb-4 h-[54px]"
            to="/sorteo"
            onClick={() => setMode('friendly')}
            title="Sorteo amistoso"
            style={{ fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '.06em', fontWeight: 400 }}
          >
            Nuevo sorteo
          </Link>
        )}
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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              className="btn btn--glass btn--sm h-11"
              to="/sorteo"
              onClick={() => setMode('friendly')}
              aria-label="Nuevo sorteo"
            >
              <Shuffle /> Sorteo
            </Link>
          )}
          <AccountButton />
        </div>
      </header>

      <main className="relative z-[1] mx-auto box-border max-w-[1240px] px-[18px] pt-2.5 pb-[120px] lg:ml-[248px] lg:px-10 lg:pt-11 lg:pb-12">
        {children}
      </main>

      {/* Móvil: seis iconos; solo la pestaña activa enseña su nombre */}
      <nav
        className={`tabbar6 lg:hidden ${pathname.endsWith('/goles') ? 'hidden' : ''}`}
        aria-label="Principal"
      >
        {MOBILE.map((item) => {
          const active = isActive(item, pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              className="t6"
              aria-current={active ? 'page' : undefined}
              aria-label={active ? undefined : item.label}
              title={item.label}
            >
              <NavIcon>{item.icon}</NavIcon>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
