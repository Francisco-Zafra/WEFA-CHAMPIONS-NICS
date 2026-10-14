import { Crown, Minus, Plus, Shuffle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { Crest, Seg } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { clearResult, isReady, participants, roundOf, setResult, tieLabel, type Cup } from '@/domain/cup'
import type { ClubId, MatchPlayer } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { cx } from '@/lib/cx'
import { updateCup } from '@/lib/data'

const isoToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TieSheet({
  cup,
  tie,
  onClose,
  onDraw,
}: {
  cup: Cup
  tie: number | null
  onClose: () => void
  onDraw: (tie: number) => void
}) {
  return (
    <Sheet
      open={tie !== null}
      onClose={onClose}
      eyebrow={tie !== null ? `${cup.name} · ${roundOf(tie).name}` : undefined}
      title={tie !== null ? tieLabel(tie) : ''}
    >
      {tie !== null && (
        <TieDetail key={`${cup.id}-${tie}`} cup={cup} tie={tie} onDone={onClose} onDraw={onDraw} />
      )}
    </Sheet>
  )
}

function TieDetail({
  cup,
  tie,
  onDone,
  onDraw,
}: {
  cup: Cup
  tie: number
  onDone: () => void
  onDraw: (tie: number) => void
}) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const t = cup.ties[tie]!
  const [a, b] = participants(cup, tie)
  const [scoreA, setScoreA] = useState(t.scoreA ?? 0)
  const [scoreB, setScoreB] = useState(t.scoreB ?? 0)
  const [winner, setWinner] = useState<ClubId | null>(t.winner)
  const [date, setDate] = useState(t.date ?? isoToday())
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  if (!a || !b || !isReady(cup, tie))
    return (
      <p className="body-text pb-2">Este cruce se completa cuando se decidan los de la ronda anterior.</p>
    )

  const draw = scoreA === scoreB
  const downstreamPlayed = cup.ties.some((x, i) => i > tie && x.winner)

  async function save() {
    const out = setResult(cup, tie, { scoreA, scoreB, winner: draw ? winner : null, date })
    if (!out.ok) {
      toast(out.error === 'need-winner' ? 'Hay empate: elige quién pasa' : 'Resultado no válido', 'error')
      return
    }
    setBusy(true)
    try {
      await updateCup(cup.id, { ties: out.ties })
      const passes = out.ties[tie]!.winner!
      toast(tie === 6 ? `¡${getClub(passes).name}, campeón!` : `${getClub(passes).name} pasa de ronda`)
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    try {
      await updateCup(cup.id, { ties: clearResult(cup, tie) })
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

      {isAdmin && draw && (
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Empate · ¿quién pasa?</p>
          <Seg
            label="Quién pasa de ronda"
            value={winner ?? ''}
            onChange={(v) => setWinner(v as ClubId)}
            options={[
              { value: a, label: getClub(a).name },
              { value: b, label: getClub(b).name },
            ]}
          />
        </div>
      )}

      {t.teamA.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Lineup club={a} team={t.teamA} captain={t.captainA} />
          <Lineup club={b} team={t.teamB} captain={t.captainB} right />
        </div>
      )}

      {!t.winner && (
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
  team,
  captain,
  right,
}: {
  club: ClubId
  team: MatchPlayer[]
  captain: string | null
  right?: boolean
}) {
  return (
    <div className={cx(`club-${club} flex flex-col gap-1.5`, right && 'items-end text-right')}>
      <span className="eyebrow" style={{ color: 'var(--club)' }}>
        {getClub(club).short}
      </span>
      <ul className={cx('flex flex-col gap-1 text-sm', right && 'items-end')}>
        {team.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            {p.id === captain && (
              <Crown className="size-3.5 text-[#ffd34d]" fill="currentColor" aria-label="Capitán" />
            )}
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
