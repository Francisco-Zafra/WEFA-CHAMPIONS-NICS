import type { CSSProperties } from 'react'
import { initials, overall, tier } from '@/domain/rating'
import { STAT_LABELS, type Player, type StatKey } from '@/domain/types'
import { cx } from '@/lib/cx'

/** Orden de la carta en dos columnas: RIT REG / TIR DEF / PAS FÍS */
const CARD_ORDER: StatKey[] = ['rit', 'reg', 'tir', 'def', 'pas', 'fis']

/** Carta estilo FUT. `size` es el font-size base: toda la carta escala en `em` */
export function PlayerCard({
  player,
  size = 10,
  off,
  className,
  style,
}: {
  player: Pick<Player, 'name' | 'stats'>
  size?: number
  off?: boolean
  className?: string
  style?: CSSProperties
}) {
  const rating = Math.round(overall(player.stats))
  const name = player.name || 'Sin nombre'
  return (
    <article
      className={cx('pc', `pc--${tier(rating)}`, off && 'pc--off', className)}
      style={{ fontSize: size, ...style }}
      aria-label={`${name}, media ${rating}`}
    >
      <div className="pc__top">
        <div>
          <div className="pc__ovr">{rating}</div>
          <div className="pc__lbl">MED</div>
        </div>
        <div className="pc__mono">
          <span>{initials(name)}</span>
        </div>
      </div>
      <div className="pc__name" style={{ fontSize: name.length > 12 ? '1.4em' : '2em' }}>
        {name}
      </div>
      <div className="pc__stats">
        {CARD_ORDER.map((k) => (
          <div key={k} className="pc__stat">
            <b>{player.stats[k]}</b>
            <span>{STAT_LABELS[k]}</span>
          </div>
        ))}
      </div>
    </article>
  )
}
