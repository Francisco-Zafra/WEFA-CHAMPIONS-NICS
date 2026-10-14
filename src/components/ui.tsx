import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { badgeUrl, getClub } from '@/domain/clubs'
import type { ClubId } from '@/domain/types'

import { cx } from '@/lib/cx'

type Variant = 'primary' | 'ghost' | 'danger' | 'gold'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-night-950 hover:brightness-110 shadow-[0_8px_30px_-8px] shadow-accent/60',
  gold: 'bg-gold text-night-950 hover:brightness-110 shadow-[0_8px_30px_-8px] shadow-gold/60',
  ghost: 'bg-white/5 text-ink hover:bg-white/10 border border-line',
  danger: 'bg-loss/15 text-loss hover:bg-loss/25 border border-loss/30',
}

export function Button({
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'display h-14 px-6 text-2xl',
        VARIANTS[variant],
        className,
      )}
    />
  )
}

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cx(
        'text-muted hover:text-ink inline-flex size-10 items-center justify-center rounded-xl transition hover:bg-white/5 active:scale-95 disabled:opacity-40',
        className,
      )}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cx(
        'relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-40',
        checked ? 'border-win/50 bg-win/80' : 'border-line bg-white/10',
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 size-[22px] rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cx('border-line flex rounded-xl border bg-white/5 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition',
            value === o.value ? 'bg-white/15 text-ink shadow' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ClubBadge({ club, className }: { club: ClubId; className?: string }) {
  const c = getClub(club)
  return (
    <img
      src={badgeUrl(club)}
      alt={c.name}
      draggable={false}
      className={cx('aspect-square rounded-full object-cover', className)}
      style={{ boxShadow: `0 0 0 2px ${c.primary}55, 0 8px 24px -6px ${c.primary}88` }}
    />
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'border-accent inline-block size-6 animate-spin rounded-full border-2 border-t-transparent',
        className,
      )}
      aria-label="Cargando"
    />
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="display text-3xl">{title}</h3>
      {children && <div className="text-muted max-w-sm text-sm">{children}</div>}
    </div>
  )
}

export function SectionTitle({
  kicker,
  title,
  right,
}: {
  kicker?: string
  title: string
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {kicker && <p className="label mb-1">{kicker}</p>}
        <h1 className="display text-5xl sm:text-6xl">{title}</h1>
      </div>
      {right}
    </div>
  )
}
