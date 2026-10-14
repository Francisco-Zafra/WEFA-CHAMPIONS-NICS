import type { ReactNode } from 'react'
import { overall, tier, TIER_LABELS } from '@/domain/rating'
import { STAT_KEYS, STAT_LABELS, type Player } from '@/domain/types'
import { cx } from '@/lib/cx'

function initials(name: string) {
  const parts = name
    .replace(/['’]s\b/gi, '')
    .split(/\s+/)
    .filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function PlayerCard({
  player,
  onClick,
  footer,
  dimmed,
  compact,
  className,
}: {
  player: Pick<Player, 'name' | 'stats'>
  onClick?: () => void
  footer?: ReactNode
  dimmed?: boolean
  compact?: boolean
  className?: string
}) {
  const rating = overall(player.stats)
  const t = tier(rating)
  // div con role=button (no <button>) para poder llevar controles dentro, como el interruptor
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cx(
        `card-${t}`,
        t === 'icon' && 'shine',
        'relative flex w-full flex-col overflow-hidden rounded-[1.35rem] p-3 text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] transition',
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-18px_rgba(0,0,0,0.95)] active:scale-[0.98]',
        dimmed && 'opacity-45 saturate-50',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-start">
          <span className={cx('display', compact ? 'text-4xl' : 'text-5xl')}>{Math.round(rating)}</span>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-70">
            {TIER_LABELS[t]}
          </span>
        </div>
        <span
          className={cx(
            'display flex items-center justify-center rounded-full bg-black/15 ring-2 ring-black/10',
            compact ? 'size-11 text-xl' : 'size-14 text-2xl',
          )}
          aria-hidden
        >
          {initials(player.name)}
        </span>
      </div>

      <div
        className={cx(
          'display mt-2 truncate border-b border-current/20 pb-1',
          compact ? 'text-xl' : 'text-2xl',
        )}
      >
        {player.name || 'Sin nombre'}
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1">
        {STAT_KEYS.map((k) => (
          <div key={k} className="flex items-baseline gap-1">
            <dd className={cx('font-extrabold tabular-nums', compact ? 'text-sm' : 'text-base')}>
              {player.stats[k]}
            </dd>
            <dt className="text-[10px] font-semibold opacity-65">{STAT_LABELS[k]}</dt>
          </div>
        ))}
      </dl>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}
