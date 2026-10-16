import { ChevronLeft, Crown, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Kit } from '@/components/Kit'
import { MatchWhenFields } from '@/components/MatchWhen'
import { MvpVoting } from '@/components/MvpVoting'
import { Pitch } from '@/components/Pitch'
import { useToast } from '@/components/Toast'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import type { Cup } from '@/domain/cup'
import { feat, hasScorers, scorersBySide, tallyGoals, tallyWarning } from '@/domain/goals'
import { captainFirst } from '@/domain/formation'
import { isPlayed, resultFor } from '@/domain/standings'
import type { ClubId, Match, Player } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { cx } from '@/lib/cx'
import { removeMatch, saveScore, saveWhen, ScoreError } from '@/lib/matchActions'
import { teamPlayers } from '@/lib/upcomingDraw'
import { useVoteData } from '@/lib/votesContext'
import { initialWhen } from '@/lib/when'

type Side = 'A' | 'B'
type Tab = 'ali' | 'goles' | 'mvp' | 'ajustes'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const longDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const clubOf = (m: Match, side: Side) => (side === 'A' ? m.clubA : m.clubB)
const scoreOf = (m: Match, side: Side) => (side === 'A' ? m.scoreA : m.scoreB)
const teamOf = (m: Match, side: Side) => (side === 'A' ? m.teamA : m.teamB)

/** «Amistoso · martes 14 oct · Campo Norte» */
function matchContext(m: Match) {
  return [m.cup ? `${m.cup.name} · ${m.cup.label}` : 'Amistoso', m.date && longDate(m.date), m.place]
    .filter(Boolean)
    .join(' · ')
}

/** Marcador: una fila por equipo (rojo arriba, azul abajo) y los penaltis si los hubo */
function ScoreBox({ m }: { m: Match }) {
  const played = isPlayed(m)
  const pens = played && m.scoreA === m.scoreB && m.winner
  return (
    <section
      className="scorebox"
      aria-label={
        played
          ? `Marcador: ${getClub(m.clubA).name} ${m.scoreA}, ${getClub(m.clubB).name} ${m.scoreB}${pens ? `; ${getClub(m.winner!).name} gana en los penaltis` : ''}`
          : 'Partido pendiente'
      }
    >
      {(['A', 'B'] as const).map((side) => {
        const lose = played && resultFor(m, side) === 'L'
        const club = getClub(clubOf(m, side))
        return (
          <div
            key={side}
            className={cx('scorebox__row', side === 'A' ? 'ta' : 'tb', lose && 'scorebox__row--lose')}
          >
            <Crest club={club.id} size={36} />
            <div className="flex min-w-0 items-center gap-2">
              <span className="nm">{club.name}</span>
              <Kit side={side} className="size-3.5" />
            </div>
            <span className="g">{played ? scoreOf(m, side) : '–'}</span>
          </div>
        )
      })}
      {pens && (
        <div className="scorebox__pen">
          <span>Penaltis: gana {getClub(m.winner!).short}</span>
        </div>
      )}
    </section>
  )
}

/** Goleadores de los dos equipos (o por qué no los hay) */
function GoalsPanel({ m, names }: { m: Match; names: Map<string, string> }) {
  const { isAdmin } = useAuth()
  const played = isPlayed(m)
  const editable = !m.id.includes(':')
  if (!played) return <p className="small text-[13px]">Los goleadores se apuntan cuando esté el resultado.</p>
  const goals = m.goals ?? null
  const scorers = scorersBySide(m, names)
  const t = goals ? tallyGoals(m, goals) : null
  const button = isAdmin && editable && (
    <Link className="btn btn--primary mt-1 h-[52px]" to={`/historial/${m.id}/goles`}>
      {goals ? 'Editar goleadores' : 'Apuntar goleadores'}
    </Link>
  )
  if (!goals || !hasScorers(m))
    return (
      <div className="flex flex-col gap-2">
        {isAdmin ? (
          <div className="tally tally--bad" role="status">
            Sin goleadores apuntados
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-[var(--line-2)] p-3">
            <span className="ball" aria-hidden style={{ width: 22, height: 22, color: 'var(--dim)' }} />
            <p className="small text-[13px]">
              {m.resultAt
                ? 'Aún no se han apuntado los goleadores.'
                : 'Este partido es de antes de apuntar goleadores. Solo cuenta el marcador.'}
            </p>
          </div>
        )}
        {button}
      </div>
    )
  const warnings = (['A', 'B'] as const)
    .map((side) => tallyWarning(t![side], getClub(clubOf(m, side)).short))
    .filter(Boolean)
  return (
    <div className="flex flex-col gap-2">
      {isAdmin &&
        warnings.map((w) => (
          <div key={w} className="tally tally--bad" role="status">
            {w}
          </div>
        ))}
      {(['A', 'B'] as const).map((side) => {
        const st = t![side]
        return (
          <div key={side} className="flex flex-col">
            <div className={cx('teamhead', side === 'A' ? 'ta' : 'tb', side === 'B' && 'mt-1.5')}>
              <Kit side={side} className="size-4" />
              <span className="flex-1">{getClub(clubOf(m, side)).name}</span>
              {isAdmin ? (
                <span
                  className="text-xs font-bold"
                  style={{ color: st.missing === 0 ? 'var(--win)' : '#FFE3A6' }}
                >
                  {st.recorded} de {st.score}
                  {st.missing === 0 && ' ✓'}
                </span>
              ) : (
                <span className="h-display text-xl">{st.score}</span>
              )}
            </div>
            {scorers[side].length === 0 ? (
              <p className="small px-2.5 py-1.5 text-[13px]">
                {st.score ? 'Sin goleadores apuntados.' : 'Sin goles.'}
              </p>
            ) : (
              scorers[side].map((s) => (
                <div key={s.id ?? 'own'} className={cx('gline', !s.id && 'gline--own')}>
                  <span className="n">{s.name}</span>
                  {s.id && feat(s.goals) && <span className="feat">{feat(s.goals)}</span>}
                  {s.goals > 1 ? (
                    <span className="text-[13px] font-bold text-[var(--ink-2)]">×{s.goals}</span>
                  ) : (
                    <span
                      className="ball"
                      aria-label="1 gol"
                      style={!s.id ? { color: 'var(--muted)' } : undefined}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )
      })}
      <p className="note mt-1">
        {t!.A.recorded + t!.B.recorded} de {t!.A.score + t!.B.score} goles apuntados.
      </p>
      {button}
    </div>
  )
}

/** Alineaciones en lista (escritorio) */
function LineupLists({ m, names }: { m: Match; names: Map<string, string> }) {
  const g = m.goals?.byPlayer ?? {}
  return (
    <div className="flex flex-col gap-2">
      {(['A', 'B'] as const).map((side) => (
        <div key={side} className="flex flex-col gap-1.5">
          <div className={cx('teamhead', side === 'A' ? 'ta' : 'tb', side === 'B' && 'mt-1')}>
            <Kit side={side} className="size-4" />
            <span>
              {getClub(clubOf(m, side)).name} · {side === 'A' ? 'arriba' : 'abajo'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-x-1.5">
            {captainFirst(teamOf(m, side), side === 'A' ? m.captainA : m.captainB).map((p) => (
              <div key={p.id} className="lp">
                <span className="n flex items-center gap-1.5">
                  {p.id === (side === 'A' ? m.captainA : m.captainB) && (
                    <Crown
                      className="size-3.5 shrink-0 text-[#ffd34d]"
                      fill="currentColor"
                      aria-label="Capitán"
                    />
                  )}
                  <span className="truncate">{names.get(p.id) ?? p.name}</span>
                  {p.id === m.mvp && <span className="star" aria-label="MVP" />}
                </span>
                {(g[p.id] ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5" aria-label={`${g[p.id]} goles`}>
                    {Array.from({ length: Math.min(g[p.id]!, 4) }, (_, i) => (
                      <span key={i} className="ball" />
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Stepper({ club, value, onChange }: { club: ClubId; value: number; onChange: (v: number) => void }) {
  const c = getClub(club)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <Crest club={club} size={26} />
        <span className="h-display h-s">{c.short}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn--glass btn--icon"
          type="button"
          aria-label={`Quitar gol a ${c.short}`}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus />
        </button>
        <span className="h-display num w-12 text-center text-5xl">{value}</span>
        <button
          className="btn btn--glass btn--icon"
          type="button"
          aria-label={`Sumar gol a ${c.short}`}
          onClick={() => onChange(Math.min(99, value + 1))}
        >
          <Plus />
        </button>
      </div>
    </div>
  )
}

function PenaltyPick({ m, value, onPick }: { m: Match; value: ClubId | null; onPick: (c: ClubId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ganador de la tanda de penaltis">
      {[m.clubA, m.clubB].map((c) => (
        <button
          key={c}
          className="penpick"
          type="button"
          aria-pressed={value === c}
          onClick={() => onPick(c)}
        >
          <Crest club={c} size={26} />
          {getClub(c).short}
          {value === c && <span className="ml-auto text-[var(--gold)]">✓</span>}
        </button>
      ))}
    </div>
  )
}

/** Ajustes del admin: marcador, penaltis, fecha y campo, borrar */
function SettingsPanel({
  m,
  cups,
  defaultPlace,
  onDeleted,
}: {
  m: Match
  cups: Cup[]
  defaultPlace: string | null
  onDeleted: () => void
}) {
  const toast = useToast()
  const votes = useVoteData()
  const played = isPlayed(m)
  const [editing, setEditing] = useState<'score' | 'when' | null>(played ? null : 'score')
  const [scoreA, setScoreA] = useState(m.scoreA ?? 0)
  const [scoreB, setScoreB] = useState(m.scoreB ?? 0)
  const [winner, setWinner] = useState<ClubId | null>(m.winner ?? null)
  const [when, setWhen] = useState(() => initialWhen(m, defaultPlace))
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const legacy = m.id.includes(':')
  const draw = scoreA === scoreB
  const cupDraw = !!m.cup && draw

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true)
    try {
      await action()
      toast(ok)
      setEditing(null)
    } catch (e) {
      toast(
        e instanceof ScoreError && e.code === 'need-winner'
          ? 'Hay empate: elige quién gana los penaltis'
          : 'No se pudo guardar',
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  if (legacy)
    return (
      <p className="small text-[13px]">
        Este cruce aún está en el formato antiguo de la copa: edítalo desde la copa.
      </p>
    )

  return (
    <div className="flex flex-col">
      <div className="setrow">
        <div>
          <b>Marcador</b>
          <br />
          <span>
            {played
              ? `${m.scoreA}–${m.scoreB}${m.cup && m.scoreA === m.scoreB && m.winner ? ' · penaltis' : ''}`
              : 'Sin resultado'}
          </span>
        </div>
        {editing !== 'score' && (
          <button className="btn btn--glass btn--sm" type="button" onClick={() => setEditing('score')}>
            {played ? 'Editar' : 'Apuntar'}
          </button>
        )}
      </div>
      {editing === 'score' && (
        <div className="flex flex-col gap-3 border-b border-[var(--line)] py-3">
          <div className="grid grid-cols-2 gap-3">
            <Stepper club={m.clubA} value={scoreA} onChange={setScoreA} />
            <Stepper club={m.clubB} value={scoreB} onChange={setScoreB} />
          </div>
          {cupDraw && (
            <>
              <b className="text-sm font-semibold">¿Quién gana la tanda de penaltis?</b>
              <PenaltyPick m={m} value={winner} onPick={setWinner} />
            </>
          )}
          <div className="flex gap-2">
            {played && (
              <button className="btn btn--ghost" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            )}
            <button
              className="btn btn--primary h-[52px] flex-1"
              type="button"
              disabled={busy || (cupDraw && !winner)}
              onClick={() =>
                void run(
                  () => saveScore(m, cups, { scoreA, scoreB, winner: cupDraw ? winner : null }),
                  'Resultado guardado',
                )
              }
            >
              {busy && <span className="spinner" />}
              Guardar resultado
            </button>
          </div>
          {m.cup && (
            <p className="note">Si cambia quién pasa, se borran los resultados de las rondas siguientes.</p>
          )}
        </div>
      )}
      {played && m.cup && m.scoreA === m.scoreB && editing !== 'score' && (
        <div className="flex flex-col gap-2 border-b border-[var(--line)] px-1 py-3">
          <b className="text-sm font-semibold">¿Quién gana la tanda?</b>
          <PenaltyPick
            m={m}
            value={m.winner ?? null}
            onPick={(c) =>
              c !== m.winner &&
              void run(
                () => saveScore(m, cups, { scoreA: m.scoreA!, scoreB: m.scoreB!, winner: c }),
                `${getClub(c).short} gana en los penaltis`,
              )
            }
          />
        </div>
      )}
      <div className="setrow">
        <div>
          <b>Campo y fecha</b>
          <br />
          <span>
            {[m.place, m.date && longDate(m.date), m.time].filter(Boolean).join(' · ') || 'Sin fecha'}
          </span>
        </div>
        {editing !== 'when' && (
          <button className="btn btn--glass btn--sm" type="button" onClick={() => setEditing('when')}>
            Editar
          </button>
        )}
      </div>
      {editing === 'when' && (
        <div className="flex flex-col gap-3 border-b border-[var(--line)] py-3">
          <MatchWhenFields value={when} onChange={setWhen} />
          <div className="flex gap-2">
            <button className="btn btn--ghost" type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button
              className="btn btn--primary flex-1"
              type="button"
              disabled={busy || !when.date}
              onClick={() => void run(() => saveWhen(m, cups, when), 'Partido actualizado')}
            >
              Guardar
            </button>
          </div>
        </div>
      )}
      <div className="setrow" style={{ borderBottom: 0 }}>
        <div>
          <b className="text-[#FFC2C9]">Borrar partido</b>
          <br />
          <span>
            {m.cup
              ? 'El cruce vuelve a estar por jugar, sin equipos.'
              : 'Sale del historial y de las estadísticas.'}
          </span>
        </div>
        <button
          className="btn btn--danger btn--sm"
          type="button"
          disabled={busy}
          onClick={() =>
            confirm
              ? void run(() => removeMatch(m, cups, votes.data), 'Partido borrado').then(onDeleted)
              : setConfirm(true)
          }
        >
          <Trash2 /> {confirm ? '¿Seguro?' : 'Borrar'}
        </button>
      </div>
    </div>
  )
}

/** Ficha de un partido: en móvil, por pestañas; en escritorio, todo a la vista */
export function MatchDetail({
  m,
  players,
  cups,
  defaultPlace,
  desktop,
}: {
  m: Match
  players: Player[]
  cups: Cup[]
  defaultPlace: string | null
  desktop: boolean
}) {
  const { isAdmin } = useAuth()
  const votes = useVoteData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const names = new Map(players.map((p) => [p.id, p.name]))
  const played = isPlayed(m)
  const goalsOk = !played || (!!m.goals && tallyGoals(m, m.goals).ok)
  const wanted = params.get('tab') as Tab | null
  const fallback: Tab = isAdmin ? (played ? 'goles' : 'ajustes') : 'ali'
  const tab: Tab = wanted && (wanted !== 'ajustes' || isAdmin) ? wanted : fallback
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const onDeleted = () => navigate('/historial', { replace: true })
  const goalCount = m.goals
    ? Object.values(m.goals.byPlayer).reduce((a, n) => a + n, 0) + m.goals.ownA + m.goals.ownB
    : 0

  const pitch = (
    <>
      <Pitch
        teamA={{ club: m.clubA, players: teamPlayers(m.teamA, players), captain: m.captainA }}
        teamB={{ club: m.clubB, players: teamPlayers(m.teamB, players), captain: m.captainB }}
        height={400}
        goals={m.goals?.byPlayer}
      />
      <div className="flex min-h-7 items-center gap-3 text-[11px] font-semibold text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Crown className="size-3.5 text-[#ffd34d]" fill="currentColor" aria-hidden /> capitán
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="ball" aria-hidden style={{ width: 11, height: 11 }} /> goles
        </span>
      </div>
    </>
  )
  const mvp = <MvpVoting match={m} votes={votes.data} players={players} />
  const settings = (
    <SettingsPanel key={m.id} m={m} cups={cups} defaultPlace={defaultPlace} onDeleted={onDeleted} />
  )

  if (desktop)
    return (
      <section
        className="glass--keep flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--glass)]"
        aria-label="Ficha del partido"
      >
        <div className="flex items-center justify-between gap-3 px-[22px] pt-5 pb-3.5">
          <p className="eyebrow">{matchContext(m)}</p>
          {isAdmin && <span className="adm">Admin</span>}
        </div>
        <ScoreBox m={m} />
        <div className="grid grid-cols-2 gap-6 px-[22px] py-5">
          <div className="flex flex-col gap-2">
            <h2 className="h-display h-m">Goles</h2>
            <GoalsPanel m={m} names={names} />
          </div>
          <div className="flex flex-col gap-3">{mvp}</div>
        </div>
        {m.teamA.length > 0 && (
          <div className="flex flex-col gap-2 px-[22px] pb-5">
            <h2 className="h-display h-m">Alineaciones</h2>
            <LineupLists m={m} names={names} />
          </div>
        )}
        {isAdmin && (
          <div className="flex flex-col gap-1 border-t border-[var(--line)] px-[22px] py-4">
            <h2 className="h-display h-s">Ajustes</h2>
            {settings}
          </div>
        )}
      </section>
    )

  const tabs: { id: Tab; label: string; badge?: string; warn?: boolean }[] = [
    { id: 'ali', label: 'Alineación' },
    {
      id: 'goles',
      label: 'Goles',
      badge: goalCount ? String(goalCount) : undefined,
      warn: isAdmin && played && !goalsOk,
    },
    { id: 'mvp', label: 'MVP' },
    ...(isAdmin ? [{ id: 'ajustes' as const, label: 'Ajustes' }] : []),
  ]
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <Link className="btn btn--ghost btn--sm pl-1" to="/historial">
          <ChevronLeft /> Historial
        </Link>
        {m.cup ? (
          <span className="cuptag">{`${m.cup.name} · ${m.cup.label}`.toUpperCase()}</span>
        ) : (
          <span className="note">{matchContext(m)}</span>
        )}
        {isAdmin ? <span className="adm">Admin</span> : <span className="w-10" />}
      </div>
      <ScoreBox m={m} />
      {m.cup && (
        <p className="note text-center">
          {[m.date && longDate(m.date), m.place].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="subtabs" role="tablist" aria-label="Apartados del partido">
        {tabs.map((t) => (
          <button
            key={t.id}
            className="subtab flex-1 justify-center"
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.warn ? (
              <span className="warn-dot" aria-label="Pendiente" />
            ) : (
              t.badge && (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold">
                  {t.badge}
                </span>
              )
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 pt-1" role="tabpanel">
        {tab === 'ali' &&
          (m.teamA.length > 0 ? (
            pitch
          ) : (
            <p className="small">Este partido no tiene alineaciones guardadas.</p>
          ))}
        {tab === 'goles' && <GoalsPanel m={m} names={names} />}
        {tab === 'mvp' && mvp}
        {tab === 'ajustes' && isAdmin && settings}
      </div>
      {isAdmin && tab === 'ali' && m.teamA.length > 0 && !played && (
        <Link className="btn btn--glass btn--sm self-center" to="/">
          <Pencil /> Rehacer o retocar desde Inicio
        </Link>
      )}
    </div>
  )
}
