import type { Ref } from 'react'
import { getClub } from '@/domain/clubs'
import { fmt } from '@/domain/rating'
import { Kit } from './Kit'
import { Pitch, type PitchTeam } from './Pitch'
import { Crest, CrestGhost, ShieldMark } from './ui'

/** Lienzo 1080×1350 (vertical de Instagram/WhatsApp) que se exporta a PNG */
export function ShareCard({
  teamA,
  teamB,
  ratingA,
  ratingB,
  date,
  ref,
}: {
  teamA: PitchTeam
  teamB: PitchTeam
  ratingA: number
  ratingB: number
  date: string
  ref?: Ref<HTMLDivElement>
}) {
  const a = getClub(teamA.club)
  const b = getClub(teamB.club)
  const diff = Math.abs(ratingA - ratingB)
  const lights = (side: 'left' | 'right') => (
    <div className="floodlights" style={{ [side]: 60, top: 26 }} aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  )

  return (
    <div
      ref={ref}
      className={`stage atmosphere grain club-${teamA.club} flex flex-col items-center`}
      style={{ width: 1080, height: 1350, boxSizing: 'border-box', padding: '64px 70px 56px', gap: 30 }}
    >
      {lights('left')}
      {lights('right')}
      <CrestGhost
        club={teamA.club}
        style={{ width: 760, height: 760, left: -220, top: 120, opacity: 0.13 }}
      />
      <CrestGhost
        club={teamB.club}
        style={{ width: 760, height: 760, right: -220, top: 620, opacity: 0.13 }}
      />

      <header className="relative flex flex-col items-center gap-4 text-center">
        <p className="eyebrow" style={{ fontSize: 18, letterSpacing: '.3em', color: 'var(--ink-2)' }}>
          Noche de Champions · {date}
        </p>
        <div className="flex items-center gap-7">
          <Crest
            club={a.id}
            size={150}
            style={{ boxShadow: `0 0 0 2px ${a.primary}, 0 0 50px ${a.primary}80` }}
          />
          <div className="flex w-[520px] flex-col items-center">
            <span
              className="h-display flex items-center gap-4"
              style={{ fontSize: 78, color: a.primary, textShadow: `0 0 30px ${a.primary}99` }}
            >
              {a.name}
              <Kit side="A" className="size-[46px]" />
            </span>
            <span className="h-display" style={{ fontSize: 40, color: 'var(--muted)' }}>
              vs
            </span>
            <span
              className="h-display flex items-center gap-4"
              style={{ fontSize: 78, color: b.primary, textShadow: `0 0 30px ${b.primary}99` }}
            >
              {b.name}
              <Kit side="B" className="size-[46px]" />
            </span>
          </div>
          <Crest
            club={b.id}
            size={150}
            style={{ boxShadow: `0 0 0 2px ${b.primary}, 0 0 50px ${b.primary}80` }}
          />
        </div>
      </header>

      <Pitch
        teamA={teamA}
        teamB={teamB}
        big
        height={820}
        style={{ width: 760, flex: 'none', borderRadius: 30 }}
      />

      <footer className="relative flex w-full items-center justify-between gap-6">
        <div className="flex items-baseline gap-3">
          <span className="h-display" style={{ fontSize: 72, color: a.primary }}>
            {fmt(ratingA)}
          </span>
          <span className="eyebrow" style={{ fontSize: 14 }}>
            Media
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="eyebrow" style={{ fontSize: 14 }}>
            Diferencia
          </span>
          <span className="h-display" style={{ fontSize: 56, color: 'var(--ok)' }}>
            {fmt(diff)}
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="eyebrow" style={{ fontSize: 14 }}>
            Media
          </span>
          <span className="h-display" style={{ fontSize: 72, color: b.primary }}>
            {fmt(ratingB)}
          </span>
        </div>
      </footer>
      <div className="relative -mt-3 flex items-center gap-3">
        <ShieldMark style={{ width: 34, height: 34, color: a.primary }} />
        <span className="h-display" style={{ fontSize: 26, letterSpacing: '.12em' }}>
          WEFA Champions NICS
        </span>
      </div>
    </div>
  )
}
