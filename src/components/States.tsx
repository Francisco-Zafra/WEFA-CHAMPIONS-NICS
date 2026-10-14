import { RefreshCw, UserPlus, ZapOff } from 'lucide-react'
import type { ReactNode } from 'react'

const CARD_CLIP = 'polygon(14% 0, 86% 0, 100% 8%, 100% 86%, 50% 100%, 0 86%, 0 8%)'

/** Estado vacío con cartas fantasma */
export function EmptyCards({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 px-6 pt-10 text-center">
      <div className="relative h-[200px] w-[240px]" aria-hidden>
        <div className="halo" style={{ width: 220, height: 220, left: 10, top: -10 }} />
        <div className="ghost-card" style={{ left: 20, top: 26, transform: 'rotate(-12deg)' }} />
        <div className="ghost-card" style={{ left: 100, top: 26, transform: 'rotate(12deg)' }} />
        <div
          className="ghost-card grid place-items-center"
          style={{
            left: 60,
            top: 10,
            background: 'linear-gradient(158deg, rgba(255,255,255,.22), rgba(255,255,255,.06))',
          }}
        >
          <UserPlus className="size-9 text-[var(--ink-2)]" />
        </div>
      </div>
      <h3 className="h-display h-l">{title}</h3>
      <p className="body-text max-w-sm">{children}</p>
      {action}
    </div>
  )
}

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="cell">
          <div className="skel" style={{ width: 156, height: 220, clipPath: CARD_CLIP }} />
          <div className="skel" style={{ width: 120, height: 24, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3.5 px-6 pt-16 text-center">
      <div
        className="grid size-24 place-items-center rounded-full"
        style={{
          background: 'rgba(255,90,106,.1)',
          boxShadow: '0 0 0 1px rgba(255,90,106,.35), 0 0 50px rgba(255,90,106,.25)',
        }}
        aria-hidden
      >
        <ZapOff className="size-10 text-[#ff8a96]" />
      </div>
      <h3 className="h-display h-l">{title}</h3>
      <p className="body-text max-w-sm">{children}</p>
      <button
        className="btn btn--primary mt-1.5 h-[52px]"
        type="button"
        onClick={() => window.location.reload()}
      >
        <RefreshCw /> Reintentar
      </button>
    </div>
  )
}
