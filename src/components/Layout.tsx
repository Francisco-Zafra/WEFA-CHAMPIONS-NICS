import { History, Lock, LogOut, Shuffle, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { LoginSheet } from './LoginSheet'
import { useToast } from './Toast'
import { cx } from '@/lib/cx'

const NAV = [
  { to: '/', label: 'Plantilla', icon: Users },
  { to: '/sorteo', label: 'Sorteo', icon: Shuffle },
  { to: '/historial', label: 'Historial', icon: History },
]

function Logo({ className }: { className?: string }) {
  return (
    <div className={cx('leading-none', className)}>
      <p className="display text-gold text-3xl">WEFA</p>
      <p className="display text-ink -mt-1 text-lg tracking-[0.2em]">Champions NICS</p>
    </div>
  )
}

function AuthButton({ wide }: { wide?: boolean }) {
  const { isAdmin, user, logout } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      {user ? (
        <button
          type="button"
          onClick={() => void logout().then(() => toast('Sesión cerrada', 'info'))}
          className={cx(
            'border-gold/40 bg-gold/10 text-gold flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition hover:bg-gold/20',
            wide && 'w-full justify-center',
          )}
          title="Cerrar sesión"
        >
          {isAdmin ? 'Admin' : 'Invitado'} <LogOut className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cx(
            'border-line text-muted hover:text-ink flex items-center gap-2 rounded-xl border bg-white/5 px-3 py-2 text-sm font-semibold transition',
            wide && 'w-full justify-center',
          )}
        >
          <Lock className="size-4" /> Entrar
        </button>
      )}
      <LoginSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Escritorio: barra lateral */}
      <aside className="border-line bg-night-950/70 fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-8 border-r p-6 backdrop-blur-xl lg:flex">
        <Logo />
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition',
                  isActive ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink hover:bg-white/5',
                )
              }
            >
              <Icon className="size-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <AuthButton wide />
        </div>
      </aside>

      {/* Móvil: cabecera */}
      <header className="border-line bg-night-950/70 sticky top-0 z-40 flex items-center justify-between border-b px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Logo className="scale-90 origin-left" />
        <AuthButton />
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>

      {/* Móvil: navegación inferior */}
      <nav className="border-line bg-night-950/85 fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-wide uppercase transition',
                isActive ? 'text-gold' : 'text-muted',
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
