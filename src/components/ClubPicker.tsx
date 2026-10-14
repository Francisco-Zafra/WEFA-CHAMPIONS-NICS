import { badgeUrl, CLUBS } from '@/domain/clubs'
import type { ClubId } from '@/domain/types'
import { cx } from '@/lib/cx'

export function ClubPicker({
  value,
  onChange,
  taken,
}: {
  value: ClubId
  onChange: (id: ClubId) => void
  /** Club elegido por el otro equipo */
  taken?: ClubId
}) {
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup">
      {CLUBS.map((c) => {
        const selected = c.id === value
        const disabled = c.id === taken
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            disabled={disabled}
            onClick={() => onChange(c.id)}
            className={cx(
              'relative aspect-square overflow-hidden rounded-2xl transition active:scale-95',
              selected ? 'scale-[1.04]' : 'opacity-60 grayscale-[60%] hover:opacity-100 hover:grayscale-0',
              disabled && 'pointer-events-none opacity-15',
            )}
            style={
              selected ? { boxShadow: `0 0 0 3px ${c.primary}, 0 10px 30px -6px ${c.primary}` } : undefined
            }
          >
            <img src={badgeUrl(c.id)} alt="" className="size-full object-cover" draggable={false} />
          </button>
        )
      })}
    </div>
  )
}
