import { ChevronDown, UserRound } from 'lucide-react'
import { useState } from 'react'
import { AVATARS, avatarLabel, avatarUrl, type AvatarId } from '@/domain/avatars'
import { cx } from '@/lib/cx'

/** Selector de avatar: muestra el elegido y despliega la rejilla con los 40 + «Sin avatar» */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId | null
  onChange: (v: AvatarId | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="field">
      <span className="label">Avatar</span>
      <button
        type="button"
        className="flex items-center gap-3 rounded-[14px] border border-[var(--line-2)] bg-[rgba(5,10,24,.6)] p-2 pr-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5">
          {value ? (
            <img src={avatarUrl(value)} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-6 text-[var(--muted)]" />
          )}
        </span>
        <span className="flex-1 font-semibold">{value ? avatarLabel(value) : 'Sin avatar'}</span>
        <ChevronDown className={cx('size-5 text-[var(--muted)] transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6" role="group" aria-label="Elegir avatar">
          <button
            type="button"
            className={cx('avatar-opt', value === null && 'avatar-opt--on')}
            aria-pressed={value === null}
            aria-label="Sin avatar"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            <UserRound className="size-7 text-[var(--muted)]" />
          </button>
          {AVATARS.map((id) => (
            <button
              key={id}
              type="button"
              className={cx('avatar-opt', value === id && 'avatar-opt--on')}
              aria-pressed={value === id}
              aria-label={avatarLabel(id)}
              title={avatarLabel(id)}
              onClick={() => {
                onChange(id)
                setOpen(false)
              }}
            >
              <img src={avatarUrl(id)} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
