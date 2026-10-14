import type { CSSProperties, ReactNode } from 'react'
import type { ClubId } from '@/domain/types'
import { cx } from '@/lib/cx'

/** Escudo recortado (rounded 24%) */
export function Crest({
  club,
  size,
  className,
  style,
}: {
  club: ClubId
  size: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={cx('crest', `crest--${club}`, className)}
      style={{ width: size, height: size, ...style }}
      aria-hidden
    />
  )
}

/** Escudo difuminado de fondo */
export function CrestGhost({ club, style }: { club: ClubId; style: CSSProperties }) {
  return <span className={`crest-ghost crest--${club}`} style={style} aria-hidden />
}

export function Switch({
  checked,
  onChange,
  label,
  srLabel,
  disabled,
}: {
  checked: boolean
  onChange?: (value: boolean) => void
  label: ReactNode
  srLabel?: string
  disabled?: boolean
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="switch__track" />
      {label}
      {srLabel && <span className="sr"> · {srLabel}</span>}
    </label>
  )
}

export function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  className?: string
}) {
  return (
    <div className={cx('seg', className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ShieldMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 34 34" aria-hidden>
      <path
        d="M17 2.5l12.5 4.8v8.6c0 7.7-5.4 12.9-12.5 15.6C9.9 28.8 4.5 23.6 4.5 15.9V7.3z"
        fill="rgba(255,255,255,.06)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M10 11l2.6 11 4.4-8 4.4 8L24 11"
        fill="none"
        stroke="#EEF2FF"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({ large }: { large?: boolean }) {
  return (
    <span className="wordmark">
      <ShieldMark className="wordmark__mark" style={large ? { width: 40, height: 40 } : undefined} />
      <span className="wordmark__txt" style={large ? { fontSize: 24 } : undefined}>
        WEFA Champions<small>NICS</small>
      </span>
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="h-display h-xl mt-1 lg:text-[72px]">{title}</h1>
      </div>
      {right}
    </div>
  )
}

export function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'info' | 'warn' | 'bad' | 'ok'
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={`banner banner--${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {icon}
      <span>{children}</span>
    </div>
  )
}
