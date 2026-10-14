import { Crown } from 'lucide-react'
import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { getClub } from '@/domain/clubs'
import { formationLines } from '@/domain/formation'
import { initials } from '@/domain/rating'
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
  /** % del ancho (centro de la ficha) */
  x: number
  /** px desde arriba (borde superior de la ficha) */
  y: number
}

/** Alto aproximado de una ficha (disco + nombre + media) y margen a la línea de fondo */
const CHIP = { small: { h: 86, pad: 8 }, big: { h: 132, pad: 22 } }

/** Separación horizontal (en % del ancho) entre fichas de una línea; las líneas alternas se abren
 *  más para que las fichas de líneas consecutivas no se pisen (como en el diseño de exportación) */
function spacing(k: number, wide: boolean): number {
  if (k <= 1) return 0
  if (k === 2) return wide ? 56 : 34
  if (k === 3) return wide ? 36 : 27
  return 76 / (k - 1)
}

/** A arriba con el portero junto a su portería; B abajo, en espejo */
function spots(team: PitchTeam, side: 'A' | 'B', height: number, big: boolean): Spot[] {
  const { h, pad } = big ? CHIP.big : CHIP.small
  const lines = formationLines(team.players, team.captain)
  const steps = Math.max(lines.length - 1, 1)
  const near = pad
  const far = height / 2 - h - 4
  return lines.flatMap((line, i) => {
    const offset = near + ((far - near) * i) / steps
    const y = side === 'A' ? offset : height - h - offset
    const gap = spacing(line.length, i % 2 === 0)
    return line.map((player, j) => ({ player, y, x: 50 + (j - (line.length - 1) / 2) * gap }))
  })
}

/** Modo edición del campo: tocar fichas para seleccionarlas / intercambiarlas */
export interface PitchEdit {
  selected: string | null
  onSelect: (playerId: string) => void
}

function Chip({
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
  if (edit)
    return (
      <motion.button
        type="button"
        layoutId={`chip-${player.id}`}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className={cx('chip chip--btn absolute', selected && 'chip--selected', target && 'chip--target')}
        style={style}
        aria-pressed={selected}
        aria-label={
          selected ? `${player.name}, seleccionado` : target ? `Intercambiar con ${player.name}` : player.name
        }
        onClick={() => edit.onSelect(player.id)}
      >
        <ChipBody player={player} captain={captain} />
      </motion.button>
    )
  return (
    <motion.div className={cx('chip absolute', big && 'chip--big')} style={style}>
      <ChipBody player={player} captain={captain} />
    </motion.div>
  )
}

function ChipBody({ player, captain }: { player: Player; captain: boolean }) {
  return (
    <>
      <div className="chip__disc">
        {initials(player.name)}
        {captain && (
          <Crown className="chip__crown" fill="currentColor" strokeWidth={1.5} aria-label="Capitán" />
        )}
      </div>
      <div className="chip__name">{player.name}</div>
      <div className="chip__ovr">{Math.round(player.rating)}</div>
    </>
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
      <div className={`club-${teamA.club}`}>
        {spots(teamA, 'A', height, !!big).map((s) => (
          <Chip
            key={s.player.id}
            spot={s}
            captain={s.player.id === teamA.captain}
            big={big}
            edit={edit}
            target={selectedSide === 'B'}
          />
        ))}
      </div>
      <div className={`club-${teamB.club}`}>
        {spots(teamB, 'B', height, !!big).map((s) => (
          <Chip
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
