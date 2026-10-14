import type { Ref } from 'react'
import { getClub } from '@/domain/clubs'
import { Pitch, type PitchTeam } from './Pitch'
import { ClubBadge } from './ui'

/** Lienzo 1080×1350 (formato vertical de Instagram/WhatsApp) que se exporta a PNG */
export function ShareCard({
  teamA,
  teamB,
  date,
  ref,
}: {
  teamA: PitchTeam & { rating: number }
  teamB: PitchTeam & { rating: number }
  date: string
  ref?: Ref<HTMLDivElement>
}) {
  const a = getClub(teamA.club)
  const b = getClub(teamB.club)
  return (
    <div
      ref={ref}
      className="bg-night-950 text-ink flex flex-col font-sans"
      style={{
        width: 1080,
        height: 1350,
        padding: 56,
        backgroundImage: `radial-gradient(900px 500px at 0% 0%, ${a.primary}33, transparent 60%), radial-gradient(900px 500px at 100% 100%, ${b.primary}33, transparent 60%)`,
      }}
    >
      <div className="text-center">
        <p className="display text-gold text-[52px]">WEFA CHAMPIONS NICS</p>
        <p className="text-muted text-[22px] font-semibold tracking-[0.25em] uppercase">{date}</p>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <TeamBlock club={teamA.club} rating={teamA.rating} count={teamA.players.length} />
        <span className="display text-[72px] text-white/60">VS</span>
        <TeamBlock club={teamB.club} rating={teamB.rating} count={teamB.players.length} />
      </div>

      <div className="mt-8 flex min-h-0 flex-1 justify-center">
        <Pitch teamA={teamA} teamB={teamB} className="h-full w-auto !text-[24px]" />
      </div>
    </div>
  )
}

function TeamBlock({ club, rating, count }: { club: PitchTeam['club']; rating: number; count: number }) {
  const c = getClub(club)
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <ClubBadge club={club} className="w-[120px]" />
      <p className="display text-[52px]" style={{ color: c.primary }}>
        {c.name}
      </p>
      <p className="text-[24px] font-bold">
        Media <span className="tabular-nums">{rating.toFixed(2)}</span>
        <span className="text-muted font-semibold"> · {count} jugadores</span>
      </p>
    </div>
  )
}
