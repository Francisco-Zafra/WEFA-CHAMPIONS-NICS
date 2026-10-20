import { Minus, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ManualLineupsModal } from '@/components/ManualLineupsModal'
import { MatchWhenFields } from '@/components/MatchWhen'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { Crest, Seg, Switch } from '@/components/ui'
import { CLUBS, getClub } from '@/domain/clubs'
import { isReady, participants, setResult, tieLabel, type Cup } from '@/domain/cup'
import type { ClubId, MatchPlayer, Player } from '@/domain/types'
import { createMatch, saveCup } from '@/lib/data'
import { initialWhen, whenToSave, type When } from '@/lib/when'

export interface RecordMatchModalProps {
  open: boolean
  onClose: () => void
  players: Player[]
  cups: Cup[]
  defaultPlace: string | null
  onSuccess?: () => void
}

export function RecordMatchModal({
  open,
  onClose,
  players,
  cups,
  defaultPlace,
  onSuccess,
}: RecordMatchModalProps) {
  const toast = useToast()

  // Open ties across cups that have participants and no winner yet
  const openTies = useMemo(() => {
    const list: { cup: Cup; tie: number; a: ClubId; b: ClubId }[] = []
    for (const cup of cups) {
      for (let i = 0; i < cup.ties.length; i++) {
        if (!cup.ties[i]!.winner && isReady(cup, i)) {
          const [a, b] = participants(cup, i)
          if (a && b) list.push({ cup, tie: i, a, b })
        }
      }
    }
    return list
  }, [cups])

  const [mode, setMode] = useState<'friendly' | string>('friendly')
  const [clubA, setClubA] = useState<ClubId>('avispas')
  const [clubB, setClubB] = useState<ClubId>('jabalies')
  const [isPlayed, setIsPlayed] = useState(true)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [winner, setWinner] = useState<ClubId | null>(null)
  const [when, setWhen] = useState<When>(() => initialWhen(undefined, defaultPlace))
  const [mvp, setMvp] = useState('')
  const [lineups, setLineups] = useState<{
    teamA: MatchPlayer[]
    teamB: MatchPlayer[]
    captainA: string | null
    captainB: string | null
  }>({ teamA: [], teamB: [], captainA: null, captainB: null })
  const [manualOpen, setManualOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // When selecting an open tie, lock clubA and clubB
  const selectedTie = useMemo(() => {
    if (mode === 'friendly') return null
    const [cupId, tieStr] = mode.split(':')
    const cup = cups.find((c) => c.id === cupId)
    const tie = Number(tieStr)
    if (!cup || Number.isNaN(tie)) return null
    const [a, b] = participants(cup, tie)
    return a && b ? { cup, tie, a, b } : null
  }, [mode, cups])

  const activeClubA = selectedTie ? selectedTie.a : clubA
  const activeClubB = selectedTie ? selectedTie.b : clubB
  const draw = scoreA === scoreB

  async function handleSave() {
    if (!when.date) {
      toast('Indica la fecha del partido', 'error')
      return
    }
    if (isPlayed && draw && !winner) {
      toast('El partido está empatado: elige el ganador de penaltis', 'error')
      return
    }

    setBusy(true)
    try {
      if (selectedTie) {
        const { cup, tie } = selectedTie
        const t = cup.ties[tie]!
        let nextTies = cup.ties.map((item, i) =>
          i === tie ? { ...item, ...whenToSave(when), ...lineups } : item,
        )

        if (isPlayed) {
          const out = setResult(cup, tie, {
            scoreA,
            scoreB,
            winner: draw ? winner : null,
            date: when.date,
          })
          if (!out.ok) {
            toast(
              out.error === 'need-winner' ? 'Elige quién gana los penaltis' : 'Error en el resultado',
              'error',
            )
            return
          }
          nextTies = out.ties
          nextTies[tie] = {
            ...nextTies[tie]!,
            ...lineups,
            mvp: mvp || null,
            resultAt: t.resultAt ?? Date.now(),
          }
        }
        await saveCup(cup, { ties: nextTies })
        toast('Partido de copa registrado')
      } else {
        await createMatch({
          ...whenToSave(when),
          clubA: activeClubA,
          clubB: activeClubB,
          ...lineups,
          scoreA: isPlayed ? scoreA : null,
          scoreB: isPlayed ? scoreB : null,
          winner: isPlayed && draw ? winner : null,
          mvp: isPlayed && mvp ? mvp : null,
          resultAt: isPlayed ? Date.now() : null,
        })
        toast('Amistoso registrado')
      }
      onSuccess?.()
      onClose()
    } catch {
      toast('No se pudo registrar el partido', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} eyebrow="Registrar partido" title="Añadir partido al historial">
        <div className="flex flex-col gap-4">
          {/* Match type */}
          {openTies.length > 0 && (
            <div className="field">
              <label htmlFor="rec-type">Tipo de partido</label>
              <select
                id="rec-type"
                className="select"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value)
                  setLineups({ teamA: [], teamB: [], captainA: null, captainB: null })
                  setWinner(null)
                }}
              >
                <option value="friendly">Amistoso</option>
                <optgroup label="Cruces de Copa pendientes">
                  {openTies.map(({ cup, tie, a, b }) => (
                    <option key={`${cup.id}:${tie}`} value={`${cup.id}:${tie}`}>
                      {cup.name} · {tieLabel(tie)} ({getClub(a).short} vs {getClub(b).short})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Club selectors (friendly mode) */}
          {mode === 'friendly' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="rec-cluba">Club local (A)</label>
                <select
                  id="rec-cluba"
                  className="select"
                  value={clubA}
                  onChange={(e) => {
                    const next = e.target.value as ClubId
                    setClubA(next)
                    if (clubB === next) setClubB(CLUBS.find((c) => c.id !== next)!.id)
                    setLineups({ teamA: [], teamB: [], captainA: null, captainB: null })
                  }}
                >
                  {CLUBS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="rec-clubb">Club visitante (B)</label>
                <select
                  id="rec-clubb"
                  className="select"
                  value={clubB}
                  onChange={(e) => {
                    setClubB(e.target.value as ClubId)
                    setLineups({ teamA: [], teamB: [], captainA: null, captainB: null })
                  }}
                >
                  {CLUBS.filter((c) => c.id !== clubA).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-1">
              <Crest club={activeClubA} size={40} />
              <span className="h-display text-lg">
                {getClub(activeClubA).short} vs {getClub(activeClubB).short}
              </span>
              <Crest club={activeClubB} size={40} />
            </div>
          )}

          {/* Played toggle */}
          <div className="glass flex items-center justify-between p-3.5">
            <div>
              <h3 className="h-display h-s">¿El partido ya se ha jugado?</h3>
              <p className="small text-xs">Apunta el marcador y los penaltis si los hubo.</p>
            </div>
            <Switch
              checked={isPlayed}
              onChange={setIsPlayed}
              label={isPlayed ? 'Sí' : 'No'}
              srLabel="Partido ya jugado"
            />
          </div>

          {/* Steppers for score */}
          {isPlayed && (
            <div className="flex flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white/[.02] p-3.5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="small text-xs font-bold text-[var(--muted)]">
                    {getClub(activeClubA).short}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn--glass btn--icon"
                      type="button"
                      aria-label="Quitar gol"
                      onClick={() => setScoreA(Math.max(0, scoreA - 1))}
                    >
                      <Minus />
                    </button>
                    <span className="h-display num w-10 text-center text-5xl">{scoreA}</span>
                    <button
                      className="btn btn--glass btn--icon"
                      type="button"
                      aria-label="Sumar gol"
                      onClick={() => setScoreA(scoreA + 1)}
                    >
                      <Plus />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="small text-xs font-bold text-[var(--muted)]">
                    {getClub(activeClubB).short}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn--glass btn--icon"
                      type="button"
                      aria-label="Quitar gol"
                      onClick={() => setScoreB(Math.max(0, scoreB - 1))}
                    >
                      <Minus />
                    </button>
                    <span className="h-display num w-10 text-center text-5xl">{scoreB}</span>
                    <button
                      className="btn btn--glass btn--icon"
                      type="button"
                      aria-label="Sumar gol"
                      onClick={() => setScoreB(scoreB + 1)}
                    >
                      <Plus />
                    </button>
                  </div>
                </div>
              </div>

              {draw && (
                <div className="flex flex-col gap-2 pt-1 border-t border-[var(--line)]">
                  <p className="eyebrow text-xs">Empate · ¿Quién gana la tanda de penaltis?</p>
                  <Seg
                    label="Ganador penaltis"
                    value={winner ?? ''}
                    onChange={(v) => setWinner(v as ClubId)}
                    options={[
                      { value: activeClubA, label: getClub(activeClubA).short },
                      { value: activeClubB, label: getClub(activeClubB).short },
                    ]}
                  />
                </div>
              )}
            </div>
          )}

          {/* Date, Time, Place */}
          <MatchWhenFields value={when} onChange={setWhen} />

          {/* Lineups section */}
          <div className="flex flex-col gap-2 rounded-[20px] border border-[var(--line)] bg-white/[.02] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <b className="text-sm">Alineaciones</b>
                <p className="small text-xs">
                  {lineups.teamA.length > 0 || lineups.teamB.length > 0
                    ? `${getClub(activeClubA).short} (${lineups.teamA.length}) vs ${getClub(activeClubB).short} (${lineups.teamB.length})`
                    : 'Opcional: puedes colocar los equipos ahora o dejarlos para después.'}
                </p>
              </div>
              <button
                className="btn btn--glass btn--sm shrink-0"
                type="button"
                onClick={() => setManualOpen(true)}
              >
                <Pencil className="size-3.5" />
                {lineups.teamA.length > 0 || lineups.teamB.length > 0 ? 'Editar' : 'Colocar a mano'}
              </button>
            </div>
          </div>

          {/* MVP (if lineups placed and played) */}
          {isPlayed && (lineups.teamA.length > 0 || lineups.teamB.length > 0) && (
            <div className="field">
              <label htmlFor="rec-mvp">MVP del partido</label>
              <select id="rec-mvp" className="select" value={mvp} onChange={(e) => setMvp(e.target.value)}>
                <option value="">Sin MVP</option>
                {[
                  [activeClubA, lineups.teamA],
                  [activeClubB, lineups.teamB],
                ].map(([club, team]) => (
                  <optgroup key={club as string} label={getClub(club as ClubId).name}>
                    {(team as MatchPlayer[]).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Save button */}
          <div className="flex gap-2.5 pt-2">
            <button className="btn btn--ghost h-[52px]" type="button" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              className="btn btn--primary h-[52px] flex-1"
              type="button"
              disabled={busy || !when.date || (isPlayed && draw && !winner)}
              onClick={() => void handleSave()}
            >
              {busy && <span className="spinner" />}
              Guardar partido
            </button>
          </div>
        </div>
      </Sheet>

      {manualOpen && (
        <ManualLineupsModal
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          clubA={activeClubA}
          clubB={activeClubB}
          initialTeamA={lineups.teamA}
          initialTeamB={lineups.teamB}
          initialCaptainA={lineups.captainA}
          initialCaptainB={lineups.captainB}
          players={players}
          onSave={(updated) => {
            setLineups(updated)
            setManualOpen(false)
          }}
        />
      )}
    </>
  )
}
