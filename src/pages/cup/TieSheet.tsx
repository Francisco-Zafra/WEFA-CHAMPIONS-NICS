import { Crown, Minus, Pencil, Plus, Shuffle, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ManualLineupsModal } from '@/components/ManualLineupsModal'
import { MvpVoting } from '@/components/MvpVoting'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { Crest, Seg } from '@/components/ui'
import { Kit } from '@/components/Kit'
import { getClub } from '@/domain/clubs'
import {
  clearResult,
  cupMatches,
  isReady,
  participants,
  roundOf,
  setResult,
  tieLabel,
  wentToPenalties,
  type Cup,
} from '@/domain/cup'
import type { ClubId, MatchPlayer, Player } from '@/domain/types'
import { resolvedMvp } from '@/domain/votes'
import { useAuth } from '@/lib/auth'
import { captainFirst } from '@/domain/formation'
import { cx } from '@/lib/cx'
import { saveCup } from '@/lib/data'
import { useClock, useVoteData } from '@/lib/votesContext'

const isoToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TieSheet({
  cup,
  tie,
  onClose,
  onDraw,
  players = [],
}: {
  cup: Cup
  tie: number | null
  onClose: () => void
  onDraw?: (tie: number) => void
  /** Para los avatares de la votación del MVP */
  players?: Player[]
}) {
  return (
    <Sheet
      open={tie !== null}
      onClose={onClose}
      eyebrow={tie !== null ? `${cup.name} · ${roundOf(tie).name}` : undefined}
      title={tie !== null ? tieLabel(tie) : ''}
    >
      {tie !== null && (
        <TieDetail
          key={`${cup.id}-${tie}`}
          cup={cup}
          tie={tie}
          onDone={onClose}
          onDraw={onDraw}
          players={players}
        />
      )}
    </Sheet>
  )
}

function TieDetail({
  cup,
  tie,
  onDone,
  onDraw,
  players,
}: {
  cup: Cup
  tie: number
  onDone: () => void
  onDraw?: (tie: number) => void
  players: Player[]
}) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const votes = useVoteData()
  const now = useClock()
  const t = cup.ties[tie]!
  const [mvp, setMvp] = useState(t.mvp ?? '')
  // El cruce como partido (para la votación del MVP); solo si ya tiene su partido guardado
  const raw = t.matchId ? cupMatches([cup], { pending: true }).find((m) => m.cup!.tie === tie) : undefined
  const match = raw && { ...raw, mvp: resolvedMvp(raw, votes.data, now) }
  const mvpName = [...t.teamA, ...t.teamB].find((p) => p.id === match?.mvp)?.name
  const [a, b] = participants(cup, tie)
  const [scoreA, setScoreA] = useState(t.scoreA ?? 0)
  const [scoreB, setScoreB] = useState(t.scoreB ?? 0)
  const [winner, setWinner] = useState<ClubId | null>(t.winner)
  const [date, setDate] = useState(t.date ?? isoToday())
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  if (!a || !b || !isReady(cup, tie))
    return (
      <p className="body-text pb-2">Este cruce se completa cuando se decidan los de la ronda anterior.</p>
    )

  const draw = scoreA === scoreB
  const downstreamPlayed = cup.ties.some((x, i) => i > tie && x.winner)

  async function save() {
    const out = setResult(cup, tie, { scoreA, scoreB, winner: draw ? winner : null, date })
    if (!out.ok) {
      toast(
        out.error === 'need-winner' ? 'Hay empate: elige quién gana los penaltis' : 'Resultado no válido',
        'error',
      )
      return
    }
    // Apuntar el resultado abre la votación del MVP (72 h)
    out.ties[tie] = { ...out.ties[tie]!, mvp: mvp || null, resultAt: t.resultAt ?? Date.now() }
    setBusy(true)
    try {
      await saveCup(cup, { ties: out.ties })
      const passes = getClub(out.ties[tie]!.winner!).name
      const pens = wentToPenalties(out.ties[tie]!) ? ' en los penaltis' : ''
      toast(tie === 6 ? `¡${passes}, campeón${pens}!` : `${passes} pasa de ronda${pens}`)
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    try {
      await saveCup(cup, { ties: clearResult(cup, tie) })
      toast('Resultado borrado', 'info')
      onDone()
    } catch {
      toast('No se pudo borrar', 'error')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdmin ? (
        <div className="grid grid-cols-2 gap-4">
          <Stepper club={a} value={scoreA} onChange={setScoreA} />
          <Stepper club={b} value={scoreB} onChange={setScoreB} />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <Crest club={a} size={52} />
          <span className="h-display num text-6xl">{t.winner ? `${t.scoreA} – ${t.scoreB}` : 'vs'}</span>
          <Crest club={b} size={52} />
        </div>
      )}

      {!isAdmin && wentToPenalties(t) && (
        <p className="text-center text-sm font-bold">{getClub(t.winner!).name} gana en los penaltis</p>
      )}

      {isAdmin && draw && (
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Empate · ¿quién gana la tanda de penaltis?</p>
          <Seg
            label="Quién gana la tanda de penaltis"
            value={winner ?? ''}
            onChange={(v) => setWinner(v as ClubId)}
            options={[
              { value: a, label: getClub(a).name },
              { value: b, label: getClub(b).name },
            ]}
          />
        </div>
      )}

      {!isAdmin && mvpName && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-[var(--warn)]">
          <Star className="size-4" fill="currentColor" /> MVP: {mvpName}
        </p>
      )}

      {t.teamA.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-4">
            <Lineup club={a} side="A" team={t.teamA} captain={t.captainA} mvp={match?.mvp ?? null} />
            <Lineup club={b} side="B" team={t.teamB} captain={t.captainB} mvp={match?.mvp ?? null} />
          </div>
          {isAdmin && (
            <button
              className="btn btn--glass btn--sm self-start"
              type="button"
              onClick={() => setManualOpen(true)}
            >
              <Pencil className="size-3.5" /> Modificar equipos a mano
            </button>
          )}
        </div>
      )}

      {match && <MvpVoting match={match} votes={votes.data} players={players} />}

      {isAdmin && t.teamA.length > 0 && (
        <div className="field">
          <label htmlFor="tie-mvp">MVP del partido</label>
          <select id="tie-mvp" className="select" value={mvp} onChange={(e) => setMvp(e.target.value)}>
            <option value="">Sin MVP</option>
            {(
              [
                [a, t.teamA],
                [b, t.teamB],
              ] as const
            ).map(([club, team]) => (
              <optgroup key={club} label={getClub(club).name}>
                {team.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {t.matchId && t.winner && (
        <Link className="btn btn--glass" to={`/historial/${t.matchId}`}>
          Ver ficha del partido · goleadores y MVP
        </Link>
      )}

      {isAdmin && t.teamA.length === 0 && (
        <button className="btn btn--glass" type="button" onClick={() => setManualOpen(true)}>
          <Pencil /> Colocar equipos a mano
        </button>
      )}

      {!t.winner && onDraw && (
        <button className="btn btn--glass" type="button" onClick={() => onDraw(tie)}>
          <Shuffle /> {t.teamA.length ? 'Volver a sortear equipos' : 'Sortear equipos de este cruce'}
        </button>
      )}

      {isAdmin && (
        <>
          <div className="field">
            <label htmlFor="tie-date">Fecha</label>
            <input
              id="tie-date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {t.winner && downstreamPlayed && (
            <p className="small text-xs">
              Si cambias quién pasa, se borrarán los resultados de las rondas siguientes que dependen de este
              cruce.
            </p>
          )}
          <div className="flex gap-2.5">
            {t.winner &&
              (confirmClear ? (
                <button
                  className="btn btn--danger h-[52px]"
                  type="button"
                  disabled={busy}
                  onClick={() => void clear()}
                >
                  ¿Seguro? Borrar
                </button>
              ) : (
                <button
                  className="btn btn--danger btn--icon size-[52px]"
                  type="button"
                  aria-label="Borrar resultado"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 />
                </button>
              ))}
            <button
              className="btn btn--primary h-[52px] flex-1"
              type="button"
              disabled={busy || !date || (draw && !winner)}
              onClick={() => void save()}
            >
              {busy && <span className="spinner" />}
              Guardar resultado
            </button>
          </div>
        </>
      )}

      {manualOpen && (
        <ManualLineupsModal
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          clubA={a}
          clubB={b}
          initialTeamA={t.teamA}
          initialTeamB={t.teamB}
          initialCaptainA={t.captainA}
          initialCaptainB={t.captainB}
          players={players}
          onSave={async (lineups) => {
            setBusy(true)
            try {
              const ties = cup.ties.map((item, i) => (i === tie ? { ...item, ...lineups } : item))
              await saveCup(cup, { ties })
              toast('Equipos guardados en el cruce')
            } catch {
              toast('No se pudieron guardar los equipos', 'error')
            } finally {
              setBusy(false)
            }
          }}
        />
      )}
    </div>
  )
}

function Stepper({ club, value, onChange }: { club: ClubId; value: number; onChange: (v: number) => void }) {
  const c = getClub(club)
  return (
    <div className={`club-${club} flex flex-col items-center gap-2`}>
      <Crest club={club} size={44} />
      <span className="h-display h-s neon max-w-full truncate">{c.short}</span>
      <div className="flex items-center gap-2">
        <button
          className="btn btn--glass btn--icon"
          type="button"
          aria-label={`Quitar gol a ${c.name}`}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus />
        </button>
        <span className="h-display num w-12 text-center text-6xl">{value}</span>
        <button
          className="btn btn--glass btn--icon"
          type="button"
          aria-label={`Sumar gol a ${c.name}`}
          onClick={() => onChange(Math.min(99, value + 1))}
        >
          <Plus />
        </button>
      </div>
    </div>
  )
}

function Lineup({
  club,
  side,
  team,
  captain,
  mvp,
}: {
  club: ClubId
  side: 'A' | 'B'
  team: MatchPlayer[]
  captain: string | null
  mvp: string | null
}) {
  const right = side === 'B'
  return (
    <div className={cx(`club-${club} flex flex-col gap-1.5`, right && 'items-end text-right')}>
      <span
        className={cx('eyebrow flex items-center gap-1.5', right && 'flex-row-reverse')}
        style={{ color: 'var(--club)' }}
      >
        {getClub(club).short}
        <Kit side={side} className="size-3.5" />
      </span>
      <ul className={cx('flex flex-col gap-1 text-sm', right && 'items-end')}>
        {captainFirst(team, captain).map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            {p.id === captain && (
              <Crown className="size-3.5 text-[#ffd34d]" fill="currentColor" aria-label="Capitán" />
            )}
            {p.name}
            {p.id === mvp && (
              <Star className="size-3.5 text-[var(--warn)]" fill="currentColor" aria-label="MVP" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
