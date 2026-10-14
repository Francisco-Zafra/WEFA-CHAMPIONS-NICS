import { Crown } from 'lucide-react'
import { badgeUrl, getClub } from '@/domain/clubs'
import { formationLines } from '@/domain/formation'
import type { ClubId, Player } from '@/domain/types'
import { cx } from '@/lib/cx'

export interface PitchTeam {
  club: ClubId
  players: Player[]
  captain: string | null
}

/**
 * Campo vertical: equipo A arriba (portero junto a la línea de fondo),
 * equipo B abajo. Todo en `em` para poder escalarlo con font-size (p.ej. imagen para compartir).
 */
export function Pitch({
  teamA,
  teamB,
  className,
}: {
  teamA: PitchTeam
  teamB: PitchTeam
  className?: string
}) {
  return (
    <div
      className={cx(
        'pitch relative isolate aspect-[3/4.3] w-full overflow-hidden rounded-[1.2em] text-[16px]',
        className,
      )}
    >
      {/* Líneas del campo */}
      <div className="absolute inset-[0.6em] rounded-[0.8em] border-[0.15em] border-white/60" />
      <div className="absolute inset-x-[0.6em] top-1/2 h-[0.15em] -translate-y-1/2 bg-white/50" />
      <div className="absolute top-1/2 left-1/2 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.15em] border-white/50" />
      <div className="absolute top-1/2 left-1/2 size-[0.5em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      <div className="absolute inset-x-[24%] top-[0.6em] h-[13%] border-[0.15em] border-t-0 border-white/50" />
      <div className="absolute inset-x-[38%] top-[0.6em] h-[5%] border-[0.15em] border-t-0 border-white/50" />
      <div className="absolute inset-x-[24%] bottom-[0.6em] h-[13%] border-[0.15em] border-b-0 border-white/50" />
      <div className="absolute inset-x-[38%] bottom-[0.6em] h-[5%] border-[0.15em] border-b-0 border-white/50" />

      {/* Escudos de fondo */}
      <img
        src={badgeUrl(teamA.club)}
        alt=""
        className="absolute top-[25%] left-1/2 w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.13] mix-blend-luminosity"
      />
      <img
        src={badgeUrl(teamB.club)}
        alt=""
        className="absolute top-[75%] left-1/2 w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.13] mix-blend-luminosity"
      />

      <Half team={teamA} side="top" />
      <Half team={teamB} side="bottom" />
    </div>
  )
}

function Half({ team, side }: { team: PitchTeam; side: 'top' | 'bottom' }) {
  const club = getClub(team.club)
  const lines = formationLines(team.players)
  // Abajo, el portero va pegado a la línea de fondo inferior
  const ordered = side === 'top' ? lines : [...lines].reverse()

  return (
    <div
      className={cx(
        'absolute inset-x-[0.8em] flex flex-col justify-around',
        side === 'top' ? 'top-[1.2em] bottom-[calc(50%+0.6em)]' : 'top-[calc(50%+0.6em)] bottom-[1.2em]',
      )}
    >
      {ordered.map((line, i) => (
        <div key={i} className="flex flex-wrap items-center justify-center gap-[0.45em]">
          {line.map((p) => (
            <Chip key={p.id} name={p.name} captain={p.id === team.captain} bg={club.primary} ink={club.ink} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Chip({ name, captain, bg, ink }: { name: string; captain: boolean; bg: string; ink: string }) {
  return (
    <span
      className="inline-flex max-w-[11em] items-center gap-[0.3em] truncate rounded-full px-[0.75em] py-[0.35em] text-[0.88em] font-extrabold shadow-[0_0.3em_0.8em_rgba(0,0,0,0.45)]"
      style={{
        background: bg,
        color: ink,
        boxShadow: `0 0 0 0.12em rgba(255,255,255,0.35), 0 0.35em 0.9em rgba(0,0,0,0.5)`,
      }}
    >
      {captain && <Crown className="size-[1.05em] shrink-0" strokeWidth={2.6} aria-label="Capitán" />}
      <span className="truncate">{name}</span>
    </span>
  )
}
