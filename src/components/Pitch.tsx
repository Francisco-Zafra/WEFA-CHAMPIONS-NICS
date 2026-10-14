import { Crown } from 'lucide-react'
import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { getClub } from '@/domain/clubs'
import { formationLines } from '@/domain/formation'
import { avatarUrl } from '@/domain/avatars'
import type { ClubId, Player } from '@/domain/types'
import { cx } from '@/lib/cx'
import { CrestGhost } from './ui'

export interface PitchTeam {
  club: ClubId
  players: Player[]
  captain: string | null
}

interface Spot {
  player: Player
  /** % del ancho (centro de la carta) */
  x: number
  /** px desde arriba (borde superior de la carta) */
  y: number
}

/** Tamaño de la mini-carta, margen a la línea de fondo y ancho aproximado del campo */
const CARD = {
  small: { w: 70, h: 94, pad: 8, pitchW: 380 },
  big: { w: 110, h: 148, pad: 16, pitchW: 760 },
}

/** Posición horizontal (%) de cada carta de una línea */
function xsFor(k: number, big: boolean): number[] {
  if (k === 1) return [50]
  if (k === 2) return big ? [30, 70] : [33, 67]
  if (k === 3) return big ? [15, 50, 85] : [20, 50, 80]
  return Array.from({ length: k }, (_, j) => ((j + 0.5) * 100) / k)
}

/**
 * A arriba con el portero junto a su portería; B abajo, en espejo.
 * Dos líneas seguidas solo se solapan en vertical si sus cartas no coinciden en horizontal
 * (como en el diseño); si chocan, la siguiente baja una carta entera.
 */
function spots(team: PitchTeam, side: 'A' | 'B', height: number, big: boolean): Spot[] {
  const { w, h, pad, pitchW } = big ? CARD.big : CARD.small
  const lines = formationLines(team.players, team.captain).map((line) => ({
    line,
    xs: xsFor(line.length, big),
  }))
  const ys: number[] = []
  lines.forEach(({ xs }, i) => {
    if (i === 0) return ys.push(pad)
    const prev = lines[i - 1]!.xs
    const collide = xs.some((x) => prev.some((px) => (Math.abs(x - px) / 100) * pitchW < w + 4))
    ys.push(ys[i - 1]! + (collide ? h + 2 : Math.round(h * 0.55)))
  })
  // Si no cabe en medio campo, se comprime
  const limit = height / 2 - h - 4
  const last = ys[ys.length - 1] ?? pad
  const k = last > limit && last > pad ? (limit - pad) / (last - pad) : 1
  return lines.flatMap(({ line, xs }, i) => {
    const offset = pad + (ys[i]! - pad) * k
    const y = side === 'A' ? offset : height - h - offset
    return line.map((player, j) => ({ player, y, x: xs[j]! }))
  })
}

/** «Guti's Boyfriend» → «Guti's BF» */
const shortName = (name: string) => name.replace(/ boyfriend$/i, ' BF')

/** Modo edición del campo: tocar cartas para seleccionarlas / intercambiarlas */
export interface PitchEdit {
  selected: string | null
  onSelect: (playerId: string) => void
}

function Card({
  spot,
  captain,
  big,
  edit,
  target,
}: {
  spot: Spot
  captain: boolean
  big?: boolean
  edit?: PitchEdit
  /** Es del equipo rival al seleccionado: tocarla intercambia */
  target?: boolean
}) {
  const { player } = spot
  const selected = edit?.selected === player.id
  const style = { left: `${spot.x}%`, top: spot.y, x: '-50%' }
  const label = `${player.name}, media ${player.rating}${captain ? ', capitán' : ''}`
  const body = (
    <>
      {captain && <Crown className="pk__crown" fill="currentColor" strokeWidth={1.5} aria-hidden />}
      <div className="pk__frame">
        <div className="pk__body">
          <span className="pk__ovr">{player.rating}</span>
          {captain && (
            <span className="pk__c" aria-hidden>
              C
            </span>
          )}
          <span className="pk__img">
            {player.avatar ? (
              <img src={avatarUrl(player.avatar)} alt="" draggable={false} />
            ) : (
              <svg viewBox="0 0 40 40" aria-hidden>
                <circle cx="20" cy="15" r="7.5" fill="rgba(238,242,255,.55)" />
                <path d="M5 40c1.5-9 7.5-13.5 15-13.5S33.5 31 35 40z" fill="rgba(238,242,255,.55)" />
              </svg>
            )}
          </span>
          <span className="pk__name">{shortName(player.name)}</span>
        </div>
      </div>
    </>
  )
  if (edit)
    return (
      <motion.button
        type="button"
        layoutId={`pk-${player.id}`}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className={cx('pk pk--btn', selected && 'pk--selected', target && 'pk--target')}
        style={style}
        aria-pressed={selected}
        aria-label={selected ? `${label}, seleccionado` : target ? `Intercambiar con ${player.name}` : label}
        onClick={() => edit.onSelect(player.id)}
      >
        {body}
      </motion.button>
    )
  return (
    <motion.div className={cx('pk', big && 'pk--big')} style={style} aria-label={label}>
      {body}
    </motion.div>
  )
}

const LINES: CSSProperties[] = [
  { inset: '1.8%', borderRadius: 6 },
  { left: '1.8%', right: '1.8%', top: '50%', height: 0, borderWidth: '2px 0 0' },
  {
    left: '37.3%',
    width: '25.4%',
    aspectRatio: '1',
    top: '50%',
    borderRadius: '50%',
    transform: 'translateY(-50%)',
  },
  { left: '24.6%', width: '50.8%', top: '1.8%', height: '12.5%', borderTop: 0 },
  { left: '37.3%', width: '25.4%', top: '1.8%', height: '5%', borderTop: 0 },
  { left: '24.6%', width: '50.8%', bottom: '1.8%', height: '12.5%', borderBottom: 0 },
  { left: '37.3%', width: '25.4%', bottom: '1.8%', height: '5%', borderBottom: 0 },
]

export function Pitch({
  teamA,
  teamB,
  height,
  big,
  edit,
  className,
  style,
}: {
  teamA: PitchTeam
  teamB: PitchTeam
  /** Alto en px: las fichas se colocan en px para que no se pisen */
  height: number
  big?: boolean
  edit?: PitchEdit
  className?: string
  style?: CSSProperties
}) {
  const a = getClub(teamA.club)
  const b = getClub(teamB.club)
  const selectedSide = !edit?.selected ? null : teamA.players.some((p) => p.id === edit.selected) ? 'A' : 'B'
  return (
    <div
      className={cx('pitch', className)}
      style={{ ...style, height }}
      role={edit ? 'group' : 'img'}
      aria-label={`Alineaciones: ${a.name} arriba, ${b.name} abajo`}
    >
      <CrestGhost
        club={teamA.club}
        style={{ width: '68%', aspectRatio: '1', left: '16%', top: '3%', opacity: 0.1 }}
      />
      <CrestGhost
        club={teamB.club}
        style={{ width: '68%', aspectRatio: '1', left: '16%', top: '53%', opacity: 0.1 }}
      />
      {LINES.map((s, i) => (
        <div
          key={i}
          className="pitch__line"
          style={big ? { ...s, borderWidth: s.borderWidth ? '3px 0 0' : 3, ...pick(s) } : s}
        />
      ))}
      <div className="team-red">
        {spots(teamA, 'A', height, !!big).map((s) => (
          <Card
            key={s.player.id}
            spot={s}
            captain={s.player.id === teamA.captain}
            big={big}
            edit={edit}
            target={selectedSide === 'B'}
          />
        ))}
      </div>
      <div className="team-blue">
        {spots(teamB, 'B', height, !!big).map((s) => (
          <Card
            key={s.player.id}
            spot={s}
            captain={s.player.id === teamB.captain}
            big={big}
            edit={edit}
            target={selectedSide === 'A'}
          />
        ))}
      </div>
    </div>
  )
}

/** Mantiene los lados sin borde de las áreas al engrosar las líneas */
function pick(s: CSSProperties): CSSProperties {
  const out: CSSProperties = {}
  if (s.borderTop === 0) out.borderTop = 0
  if (s.borderBottom === 0) out.borderBottom = 0
  return out
}
