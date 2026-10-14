import { Check, Shuffle, Trophy, Users } from 'lucide-react'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { champion, feeders, isReady, participants, ROUNDS, tieLabel, type Cup } from '@/domain/cup'
import type { ClubId } from '@/domain/types'
import { cx } from '@/lib/cx'

const dayMonth = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/** Cuadro: rondas apiladas en móvil, columnas con conectores en escritorio */
export function Bracket({
  cup,
  onOpen,
  onDraw,
}: {
  cup: Cup
  onOpen: (tie: number) => void
  onDraw: (tie: number) => void
}) {
  const win = champion(cup)
  return (
    <div className="bracket">
      {ROUNDS.map((round) => (
        <section key={round.key} className={`bracket__round bracket__round--${round.key}`}>
          <h2 className="eyebrow mb-1 lg:text-center">{round.name}</h2>
          <div className="bracket__ties">
            {round.ties.map((tie) => (
              <TieCard key={tie} cup={cup} tie={tie} onOpen={() => onOpen(tie)} onDraw={() => onDraw(tie)} />
            ))}
          </div>
        </section>
      ))}
      <section className="bracket__round bracket__round--champ">
        <h2 className="eyebrow mb-1 lg:text-center">Campeón</h2>
        <div className={cx('champ glass', win && `glass--club club-${win}`)}>
          {win ? (
            <>
              <div className="halo" style={{ width: 200, height: 200 }} />
              <Trophy className="relative size-7 text-[#ffd34d]" fill="currentColor" />
              <Crest club={win} size={88} className="relative" />
              <span className="h-display neon relative text-3xl">{getClub(win).name}</span>
            </>
          ) : (
            <>
              <Trophy className="size-9 text-[var(--dim)]" />
              <span className="small">Por decidir</span>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function TieCard({
  cup,
  tie,
  onOpen,
  onDraw,
}: {
  cup: Cup
  tie: number
  onOpen: () => void
  onDraw: () => void
}) {
  const t = cup.ties[tie]!
  const [a, b] = participants(cup, tie)
  const ready = isReady(cup, tie)
  const decided = !!t.winner
  const drawn = t.teamA.length > 0
  const from = feeders(tie)
  const pending = ready && !decided

  return (
    <article className={cx('tie', pending && 'tie--next', decided && `tie--done`)}>
      <button className="tie__body" type="button" onClick={onOpen} aria-label={`${tieLabel(tie)}: ver cruce`}>
        <header className="flex items-center justify-between gap-2">
          <span className="eyebrow text-[10px]">{tieLabel(tie)}</span>
          {decided ? (
            <span className="small text-[11px]">{t.date ? dayMonth(t.date) : 'Jugado'}</span>
          ) : drawn ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ok)]">
              <Users className="size-3.5" /> Equipos listos
            </span>
          ) : pending ? (
            <span className="pill pill--on h-6 px-2 text-[10px]">Por jugar</span>
          ) : null}
        </header>
        <Row
          club={a}
          score={t.scoreA}
          winner={t.winner}
          decided={decided}
          placeholder={from ? `Ganador ${tieLabel(from[0])}` : ''}
        />
        <Row
          club={b}
          score={t.scoreB}
          winner={t.winner}
          decided={decided}
          placeholder={from ? `Ganador ${tieLabel(from[1])}` : ''}
        />
      </button>
      {pending && (
        <button className="tie__action" type="button" onClick={onDraw}>
          <Shuffle /> {drawn ? 'Volver a sortear equipos' : 'Sortear equipos'}
        </button>
      )}
    </article>
  )
}

function Row({
  club,
  score,
  winner,
  decided,
  placeholder,
}: {
  club: ClubId | null
  score: number | null
  winner: ClubId | null
  decided: boolean
  placeholder: string
}) {
  if (!club)
    return (
      <div className="tie__row tie__row--tbd">
        <span className="tie__crest-tbd" aria-hidden>
          ?
        </span>
        <span className="truncate text-[13px]">{placeholder}</span>
      </div>
    )
  const won = decided && winner === club
  const lost = decided && winner !== club
  return (
    <div className={cx('tie__row', `club-${club}`, won && 'tie__row--won', lost && 'tie__row--lost')}>
      <Crest club={club} size={30} style={{ borderRadius: 8 }} />
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{getClub(club).name}</span>
      {won && (
        <Check className="size-4 shrink-0 text-[var(--club)]" strokeWidth={3} aria-label="Pasa de ronda" />
      )}
      <span className="h-display num w-6 text-right text-2xl">{score ?? ''}</span>
    </div>
  )
}
