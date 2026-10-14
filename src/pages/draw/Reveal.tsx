import { Crown, FastForward, Volume2, VolumeX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { PlayerCard } from '@/components/PlayerCard'
import { ClubBadge, IconButton } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { overall } from '@/domain/rating'
import type { Player } from '@/domain/types'
import { useAnthem } from '@/hooks/useAnthem'
import type { Draw } from '@/lib/draw'

const INTRO_MS = 2600
const STEP_MS = 1150

interface Step {
  side: 'A' | 'B'
  player: Player
}

/** Capitán primero; el resto de menos a más media para dejar lo mejor para el final */
function revealOrder(players: Player[], captain: string | null): Player[] {
  const cap = players.find((p) => p.id === captain)
  const rest = players.filter((p) => p !== cap).sort((a, b) => overall(a.stats) - overall(b.stats))
  return cap ? [cap, ...rest] : rest
}

export function Reveal({ draw, onDone }: { draw: Draw; onDone: () => void }) {
  const anthem = useAnthem()
  const { play, fadeOut } = anthem
  const clubA = getClub(draw.clubA)
  const clubB = getClub(draw.clubB)
  const steps = useMemo<Step[]>(
    () => [
      ...revealOrder(draw.result.teamA.players, draw.captainA).map((player) => ({
        side: 'A' as const,
        player,
      })),
      ...revealOrder(draw.result.teamB.players, draw.captainB).map((player) => ({
        side: 'B' as const,
        player,
      })),
    ],
    [draw],
  )
  // -1 = intro "VS"; steps.length = final
  const [index, setIndex] = useState(-1)
  const current = steps[index]
  const shown = steps.slice(0, Math.max(0, index + 1))
  const finished = index >= steps.length

  useEffect(() => {
    play(draw.clubA)
  }, [play, draw.clubA])

  useEffect(() => {
    if (current?.side === 'B' && steps[index - 1]?.side === 'A') play(draw.clubB)
  }, [current, index, steps, play, draw.clubB])

  useEffect(() => {
    if (finished) {
      fadeOut(1500)
      const t = setTimeout(onDone, 1600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setIndex((i) => i + 1), index === -1 ? INTRO_MS : STEP_MS)
    return () => clearTimeout(t)
  }, [index, finished, fadeOut, onDone])

  const accent = current?.side === 'B' ? clubB : clubA

  return createPortal(
    <motion.div
      className="bg-night-950 fixed inset-0 z-[70] flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        backgroundImage: `radial-gradient(60rem 30rem at 50% 50%, ${accent.primary}26, transparent 70%)`,
        transition: 'background-image 0.6s',
      }}
    >
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <IconButton
          label={anthem.muted ? 'Activar sonido' : 'Silenciar'}
          onClick={() => anthem.setMuted(!anthem.muted)}
        >
          {anthem.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </IconButton>
        <IconButton
          label="Saltar"
          onClick={() => {
            anthem.stop()
            onDone()
          }}
        >
          <FastForward className="size-5" />
        </IconButton>
      </div>

      <AnimatePresence mode="wait">
        {index === -1 ? (
          <motion.div
            key="intro"
            className="flex flex-1 flex-col items-center justify-center gap-6 px-6"
            exit={{ opacity: 0, scale: 1.2 }}
          >
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 14 }}
            >
              <ClubBadge club={draw.clubA} className="w-36 sm:w-48" />
            </motion.div>
            <motion.span
              className="display text-gold text-8xl"
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', damping: 10 }}
            >
              VS
            </motion.span>
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, delay: 0.2 }}
            >
              <ClubBadge club={draw.clubB} className="w-36 sm:w-48" />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="draft"
            className="flex flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <TeamRow side="A" draw={draw} shown={shown} />
            <div className="flex flex-1 items-center justify-center px-6">
              <AnimatePresence mode="popLayout">
                {current && (
                  <motion.div
                    key={current.player.id}
                    className="w-48 sm:w-56"
                    initial={{ rotateY: 90, scale: 0.6, opacity: 0 }}
                    animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                    exit={{ y: current.side === 'A' ? -260 : 260, scale: 0.3, opacity: 0 }}
                    transition={{ type: 'spring', damping: 16, stiffness: 140 }}
                    style={{ perspective: 800 }}
                  >
                    <PlayerCard player={current.player} />
                    {(current.player.id === draw.captainA || current.player.id === draw.captainB) && (
                      <p className="display text-gold mt-2 flex items-center justify-center gap-2 text-2xl">
                        <Crown className="size-5" /> Capitán
                      </p>
                    )}
                  </motion.div>
                )}
                {finished && (
                  <motion.p
                    key="end"
                    className="display text-gold text-6xl"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    ¡A jugar!
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <TeamRow side="B" draw={draw} shown={shown} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  )
}

function TeamRow({ side, draw, shown }: { side: 'A' | 'B'; draw: Draw; shown: Step[] }) {
  const club = getClub(side === 'A' ? draw.clubA : draw.clubB)
  const players = shown.filter((s) => s.side === side).map((s) => s.player)
  const total = (side === 'A' ? draw.result.teamA : draw.result.teamB).players.length
  return (
    <div
      className={`flex flex-col items-center gap-2 px-4 ${side === 'A' ? 'pt-16' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]'}`}
    >
      <div className={`flex items-center gap-3 ${side === 'B' ? 'order-2' : ''}`}>
        <ClubBadge club={club.id} className="w-10" />
        <span className="display text-3xl" style={{ color: club.primary }}>
          {club.name}
        </span>
        <span className="text-muted text-sm font-bold tabular-nums">
          {players.length}/{total}
        </span>
      </div>
      <div className="flex min-h-9 max-w-3xl flex-wrap justify-center gap-1.5">
        <AnimatePresence>
          {players.map((p) => (
            <motion.span
              key={p.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full px-3 py-1 text-sm font-extrabold"
              style={{ background: club.primary, color: club.ink }}
            >
              {p.name}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
