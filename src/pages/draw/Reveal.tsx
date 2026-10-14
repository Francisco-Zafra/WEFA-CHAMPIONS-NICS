import { Crown, Volume2, VolumeX } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { PlayerCard } from '@/components/PlayerCard'
import { Crest, CrestGhost } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { averageRating, balancePct, fmt, initials, overall } from '@/domain/rating'
import type { Player } from '@/domain/types'
import { useAnthem } from '@/hooks/useAnthem'
import type { Draw } from '@/lib/draw'

const SHOW_MS = 1050
const FLY_MS = 550
const START_MS = 500
const END_MS = 1100

interface Pick {
  side: 'A' | 'B'
  player: Player
}

/** Capitán primero; el resto de menos a más media para dejar lo mejor para el final */
function order(players: Player[], captain: string | null): Player[] {
  const cap = players.find((p) => p.id === captain)
  const rest = players.filter((p) => p !== cap).sort((a, b) => overall(a.stats) - overall(b.stats))
  return cap ? [cap, ...rest] : rest
}

/** Draft alternando A, B, A, B… */
function draftOrder(draw: Draw): Pick[] {
  const a = order(draw.result.teamA.players, draw.captainA)
  const b = order(draw.result.teamB.players, draw.captainB)
  const out: Pick[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push({ side: 'A', player: a[i]! })
    if (b[i]) out.push({ side: 'B', player: b[i]! })
  }
  return out
}

export function Reveal({ draw, onDone }: { draw: Draw; onDone: () => void }) {
  const reduced = useReducedMotion()
  const anthem = useAnthem()
  const { play, fadeOut, stop } = anthem
  const picks = useMemo(() => draftOrder(draw), [draw])
  const total = picks.length
  /** Cartas ya colocadas en su equipo */
  const [landed, setLanded] = useState(0)
  const [phase, setPhase] = useState<'wait' | 'show' | 'fly'>('wait')
  const current = picks[landed]
  const finished = landed >= total

  useEffect(() => {
    play(draw.clubA)
  }, [play, draw.clubA])

  useEffect(() => {
    if (landed === Math.ceil(total / 2) && total > 1) play(draw.clubB)
  }, [landed, total, play, draw.clubB])

  useEffect(() => {
    if (finished) {
      fadeOut(1000)
      const t = setTimeout(onDone, END_MS)
      return () => clearTimeout(t)
    }
    const next =
      phase === 'wait'
        ? () => setPhase('show')
        : phase === 'show'
          ? () => setPhase('fly')
          : () => {
              setLanded((n) => n + 1)
              setPhase('show')
            }
    const t = setTimeout(next, phase === 'wait' ? START_MS : phase === 'show' ? SHOW_MS : FLY_MS)
    return () => clearTimeout(t)
  }, [phase, finished, fadeOut, onDone])

  const shown = picks.slice(0, landed)
  const teamA = shown.filter((p) => p.side === 'A').map((p) => p.player)
  const teamB = shown.filter((p) => p.side === 'B').map((p) => p.player)
  const diff = teamA.length && teamB.length ? Math.abs(averageRating(teamA) - averageRating(teamB)) : null
  const targetClub = current?.side === 'B' ? draw.clubB : draw.clubA

  const skip = () => {
    stop()
    onDone()
  }

  return createPortal(
    <motion.div
      className={`club-${draw.clubA} atmosphere grain fixed inset-0 z-[70] overflow-hidden`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Revelación de equipos"
    >
      <div className="relative mx-auto flex h-full max-w-[480px] flex-col">
        <Zone side="A" draw={draw} revealed={teamA} />

        {/* Carta central */}
        <div className="relative z-[5] flex flex-1 flex-col items-center justify-center">
          <div className={`club-${targetClub} halo`} style={{ width: 300, height: 300 }} />
          <p className="eyebrow relative mb-2" aria-live="polite">
            {finished ? (
              '¡Equipos listos!'
            ) : (
              <>
                Carta <span className="num text-[var(--ink)]">{landed + 1}</span> de {total}
              </>
            )}
          </p>
          <div className="relative h-[220px] w-[156px]" style={{ perspective: 900 }}>
            <AnimatePresence>
              {current && phase !== 'wait' && (
                <motion.div
                  key={current.player.id}
                  className="absolute inset-0"
                  initial={reduced ? { opacity: 0 } : { rotateY: 180, scale: 0.6, opacity: 0 }}
                  animate={
                    phase === 'fly' && !reduced
                      ? { y: current.side === 'A' ? -260 : 260, scale: 0.42, opacity: 0, rotateY: 0 }
                      : { rotateY: 0, scale: 1, opacity: 1, y: 0 }
                  }
                  exit={{ opacity: 0 }}
                  transition={
                    phase === 'fly'
                      ? { duration: FLY_MS / 1000, ease: [0.2, 0.9, 0.25, 1] }
                      : { type: 'spring', stiffness: 260, damping: 22 }
                  }
                >
                  <PlayerCard player={current.player} />
                  {(current.player.id === draw.captainA || current.player.id === draw.captainB) && (
                    <p className="h-display mt-2 flex items-center justify-center gap-1.5 text-xl text-[#ffd34d]">
                      <Crown className="size-4" fill="currentColor" /> Capitán
                    </p>
                  )}
                </motion.div>
              )}
              {finished && (
                <motion.p
                  key="end"
                  className="h-display neon absolute inset-0 grid place-items-center text-6xl"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  ¡A jugar!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Equilibrio */}
        <div className="relative z-[6] flex flex-col gap-1.5 px-[18px] pb-3">
          <div className="flex items-baseline justify-between">
            <span className="label">Equilibrio</span>
            <span className="small text-xs">
              Δ media <span className="num text-[var(--ink)]">{diff === null ? '–' : fmt(diff)}</span> · se
              ajusta con cada carta
            </span>
          </div>
          <div className="meter">
            <div className="meter__fill" style={{ width: `${diff === null ? 0 : balancePct(diff)}%` }} />
          </div>
        </div>

        <Zone side="B" draw={draw} revealed={teamB} />

        <div className="absolute top-[38px] right-[18px] z-10 flex gap-1.5">
          <button
            className="btn btn--glass btn--icon size-10"
            type="button"
            aria-label={anthem.muted ? 'Activar himno' : 'Silenciar himno'}
            onClick={() => anthem.setMuted(!anthem.muted)}
          >
            {anthem.muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button className="btn btn--glass btn--sm h-10" type="button" onClick={skip}>
            Saltar
          </button>
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}

function Zone({ side, draw, revealed }: { side: 'A' | 'B'; draw: Draw; revealed: Player[] }) {
  const clubId = side === 'A' ? draw.clubA : draw.clubB
  const club = getClub(clubId)
  const team = side === 'A' ? draw.result.teamA : draw.result.teamB
  const captain = side === 'A' ? draw.captainA : draw.captainB
  const empty = team.players.length - revealed.length
  const top = side === 'A'

  const band = (
    <div className="club-band relative self-start pr-4">
      <Crest club={clubId} size={34} />
      <div>
        <div className="h-display h-s">{club.name}</div>
        <div className="small text-[11px]">
          Equipo {side} · media{' '}
          <span className="num text-[var(--ink)]">
            {revealed.length ? fmt(averageRating(revealed)) : '–'}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={`club-${clubId} relative flex flex-col gap-3.5 overflow-hidden px-[18px] ${top ? 'pt-[38px] pb-2' : 'pt-2 pb-[max(26px,env(safe-area-inset-bottom))]'}`}
      style={{
        background: `linear-gradient(${top ? '180deg' : '0deg'}, color-mix(in oklab, var(--club) 16%, transparent), transparent)`,
      }}
    >
      <CrestGhost
        club={clubId}
        style={{
          width: 340,
          height: 340,
          left: '50%',
          marginLeft: -170,
          [top ? 'top' : 'bottom']: top ? -40 : -80,
          opacity: 0.2,
        }}
      />
      {top && band}
      <div className="relative grid grid-cols-3 justify-items-center gap-y-3">
        {revealed.map((p) => (
          <motion.div
            key={p.id}
            className="chip"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.25, 1], opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div className="chip__disc">
              {initials(p.name)}
              {p.id === captain && (
                <Crown className="chip__crown" fill="currentColor" strokeWidth={1.5} aria-label="Capitán" />
              )}
            </div>
            <div className="chip__name">{p.name}</div>
          </motion.div>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <div key={`e${i}`} className="chip">
            <span className="slot-empty" aria-label="Hueco libre">
              ?
            </span>
          </div>
        ))}
      </div>
      {!top && band}
    </div>
  )
}
