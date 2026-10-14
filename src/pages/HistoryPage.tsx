import { Crown, Minus, Plus, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '@/components/Sheet'
import { EmptyCards, ErrorState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { Crest, PageHeader, Seg } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { initials } from '@/domain/rating'
import { clubStandings, isPlayed, playerStandings, type Outcome } from '@/domain/standings'
import type { Match, Player } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { captainFirst } from '@/domain/formation'
import { cx } from '@/lib/cx'
import { deleteMatch, updateMatch, type Collection } from '@/lib/data'

type Tab = 'matches' | 'clubs' | 'players'

const dayMonth = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/** Temporada septiembre–agosto */
function seasonOf(date = new Date()) {
  const y = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1
  return `${y}–${String(y + 1).slice(2)}`
}

export function HistoryPage({
  matches,
  players,
}: {
  matches: Collection<Match>
  players: Collection<Player>
}) {
  const [tab, setTab] = useState<Tab>('matches')

  let content
  if (matches.loading)
    content = (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel h-[70px] rounded-[18px]" />
        ))}
      </div>
    )
  else if (matches.error)
    content = (
      <ErrorState title="Se ha ido la luz del estadio">
        No hemos podido cargar los partidos. Revisa tu conexión e inténtalo de nuevo; lo que ya tenías
        guardado no se ha perdido.
      </ErrorState>
    )
  else if (tab === 'matches') content = <MatchList matches={matches.data} />
  else if (tab === 'clubs') content = <ClubTable matches={matches.data} />
  else content = <PlayerTable matches={matches.data} players={players.data} />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader eyebrow={`Temporada ${seasonOf()}`} title="Historial" />
      <Seg<Tab>
        label="Secciones del historial"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'matches', label: 'Partidos' },
          { value: 'clubs', label: 'Clubes' },
          { value: 'players', label: 'Jugadores' },
        ]}
      />
      {content}
    </div>
  )
}

// ---------- Partidos ----------

function MatchList({ matches }: { matches: Match[] }) {
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState<Match | null>(null)
  if (matches.length === 0)
    return (
      <EmptyCards
        title="Aún no hay partidos"
        action={
          isAdmin && (
            <Link className="btn btn--primary mt-1.5 h-[52px]" to="/sorteo">
              Hacer un sorteo
            </Link>
          )
        }
      >
        Sortea equipos y pulsa «Guardar partido» en la pizarra para empezar a escribir la historia.
      </EmptyCards>
    )
  const played = matches.filter(isPlayed).length
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="h-display h-m">Partidos</h2>
        <span className="small">
          {played} jugados{matches.length > played && ` · ${matches.length - played} pendientes`}
        </span>
      </div>
      {matches.map((m) => (
        <MatchRow key={m.id} match={m} onOpen={() => setOpen(m)} />
      ))}
      <MatchSheet match={open} onClose={() => setOpen(null)} />
    </section>
  )
}

function MatchRow({ match, onOpen }: { match: Match; onOpen: () => void }) {
  const a = getClub(match.clubA)
  const b = getClub(match.clubB)
  const done = isPlayed(match)
  const loseA = done && match.scoreA! < match.scoreB!
  const loseB = done && match.scoreB! < match.scoreA!
  return (
    <button
      className="match"
      type="button"
      onClick={onOpen}
      aria-label={`${a.name} contra ${b.name}, ${dayMonth(match.date)}`}
    >
      <div className={cx('side', loseA && 'lose')}>
        <Crest club={a.id} size={36} />
        <span>{a.name}</span>
      </div>
      <div className="score">
        {done ? (
          <b className="num">
            {match.scoreA} – {match.scoreB}
          </b>
        ) : (
          <span className="pill pill--on h-7 text-[11px]">Pendiente</span>
        )}
        <span className="small text-[11px]">{dayMonth(match.date)}</span>
      </div>
      <div className={cx('side flex-row-reverse text-right', loseB && 'lose')}>
        <Crest club={b.id} size={36} />
        <span>{b.name}</span>
      </div>
    </button>
  )
}

function MatchSheet({ match, onClose }: { match: Match | null; onClose: () => void }) {
  return (
    <Sheet
      open={match !== null}
      onClose={onClose}
      eyebrow={match ? dayMonth(match.date) : undefined}
      title={match && isPlayed(match) ? 'Resultado' : 'Partido'}
    >
      {match && <MatchDetail key={match.id} match={match} onDone={onClose} />}
    </Sheet>
  )
}

function MatchDetail({ match, onDone }: { match: Match; onDone: () => void }) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0)
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0)
  const [mvp, setMvp] = useState(match.mvp ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const a = getClub(match.clubA)
  const b = getClub(match.clubB)
  const mvpName = [...match.teamA, ...match.teamB].find((p) => p.id === match.mvp)?.name

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true)
    try {
      await action()
      toast(message)
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  const roster = (team: Match['teamA'], captain: string | null, club: typeof a, right?: boolean) => (
    <div className={`club-${club.id} flex flex-col gap-1.5`}>
      <div className={cx('flex items-center gap-2', right && 'flex-row-reverse')}>
        <Crest club={club.id} size={28} />
        <span className="h-display h-s truncate">{club.short}</span>
      </div>
      <ul className={cx('flex flex-col gap-1 text-sm', right && 'items-end')}>
        {captainFirst(team, captain).map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            {p.id === captain && (
              <Crown className="size-3.5 text-[#ffd34d]" fill="currentColor" aria-label="Capitán" />
            )}
            {p.name}
            {p.id === match.mvp && (
              <Star className="size-3.5 text-[var(--warn)]" fill="currentColor" aria-label="MVP" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {isAdmin ? (
        <div className="grid grid-cols-2 gap-4">
          <Stepper club={a.id} label={a.short} value={scoreA} onChange={setScoreA} />
          <Stepper club={b.id} label={b.short} value={scoreB} onChange={setScoreB} />
        </div>
      ) : (
        isPlayed(match) && (
          <div className="flex items-center justify-center gap-4">
            <Crest club={a.id} size={52} />
            <span className="h-display num text-6xl">
              {match.scoreA} – {match.scoreB}
            </span>
            <Crest club={b.id} size={52} />
          </div>
        )
      )}

      {!isAdmin && mvpName && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-[var(--warn)]">
          <Star className="size-4" fill="currentColor" /> MVP: {mvpName}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {roster(match.teamA, match.captainA, a)}
        {roster(match.teamB, match.captainB, b, true)}
      </div>

      {isAdmin && (
        <>
          <div className="field">
            <label htmlFor="mvp">MVP del partido</label>
            <select id="mvp" className="select" value={mvp} onChange={(e) => setMvp(e.target.value)}>
              <option value="">Sin MVP</option>
              <optgroup label={a.name}>
                {match.teamA.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label={b.name}>
                {match.teamB.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="flex gap-2.5">
            {confirmDelete ? (
              <button
                className="btn btn--danger h-[52px]"
                type="button"
                disabled={busy}
                onClick={() => void run(() => deleteMatch(match.id), 'Partido eliminado')}
              >
                ¿Seguro? Eliminar
              </button>
            ) : (
              <button
                className="btn btn--danger btn--icon size-[52px]"
                type="button"
                aria-label="Eliminar partido"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 />
              </button>
            )}
            <button
              className="btn btn--primary h-[52px] flex-1"
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  () => updateMatch(match.id, { scoreA, scoreB, mvp: mvp || null }),
                  'Resultado guardado',
                )
              }
            >
              Guardar resultado
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Stepper({
  club,
  label,
  value,
  onChange,
}: {
  club: Match['clubA']
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className={`club-${club} flex flex-col items-center gap-2`}>
      <div className="flex items-center gap-2">
        <Crest club={club} size={28} />
        <span className="h-display h-s neon">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn--glass btn--icon"
          type="button"
          aria-label={`Quitar gol a ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus />
        </button>
        <span className="h-display num w-14 text-center text-6xl">{value}</span>
        <button
          className="btn btn--glass btn--icon"
          type="button"
          aria-label={`Sumar gol a ${label}`}
          onClick={() => onChange(Math.min(99, value + 1))}
        >
          <Plus />
        </button>
      </div>
    </div>
  )
}

// ---------- Clasificaciones ----------

function ClubTable({ matches }: { matches: Match[] }) {
  const rows = useMemo(() => clubStandings(matches), [matches])
  const totals = rows.reduce((t, r) => ({ w: t.w + r.won, d: t.d + r.drawn }), { w: 0, d: 0 })
  return (
    <section className="glass flex flex-col gap-1.5 px-3.5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="h-display h-m">Clasificación</h2>
        <span className="small text-[11px]">
          {totals.w} victorias · {totals.d / 2} empates
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Club</th>
              <th scope="col">PJ</th>
              <th scope="col">G</th>
              <th scope="col">E</th>
              <th scope="col">P</th>
              <th scope="col" className="hidden sm:table-cell">
                DG
              </th>
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.club}
                className={cx(
                  i === 0 && r.points > 0 && `lead club-${r.club}`,
                  r.played === 0 && 'opacity-50',
                )}
              >
                <td>
                  <div className="flex items-center gap-2">
                    <span className="num w-3.5 text-xs text-[var(--muted)]">{i + 1}</span>
                    <Crest club={r.club} size={28} style={{ borderRadius: 8 }} />
                    <span className="font-semibold whitespace-nowrap text-[var(--ink)]">
                      {getClub(r.club).name}
                    </span>
                  </div>
                </td>
                <td>{r.played}</td>
                <td>{r.won}</td>
                <td>{r.drawn}</td>
                <td>{r.lost}</td>
                <td className="hidden sm:table-cell">{r.goalsFor - r.goalsAgainst}</td>
                <td className="pts">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small text-[11px]">Empate a puntos: decide la diferencia de goles.</p>
    </section>
  )
}

const FORM: Record<Outcome, { c: string; t: string }> = {
  W: { c: 'w', t: 'V' },
  D: { c: 'd', t: 'E' },
  L: { c: 'l', t: 'D' },
}

function PlayerTable({ matches, players }: { matches: Match[]; players: Player[] }) {
  const rows = useMemo(
    () => playerStandings(matches, new Map(players.map((p) => [p.id, p.name]))),
    [matches, players],
  )
  if (rows.length === 0)
    return (
      <EmptyCards title="Sin estadísticas">
        Cuando haya partidos con resultado aparecerá aquí el ranking de jugadores.
      </EmptyCards>
    )
  return (
    <section className="glass flex flex-col gap-1.5 px-3.5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="h-display h-m">Jugadores</h2>
        <span className="pill pill--on h-[30px] cursor-default">Por victorias</span>
      </div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Jugador</th>
              <th scope="col">V</th>
              <th scope="col">%</th>
              <th scope="col">MVP</th>
              <th scope="col">Racha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const recent = [...r.form].reverse()
              const last = recent[0]
              let streak = 0
              while (streak < recent.length && recent[streak] === last) streak++
              const streakColor = last === 'W' ? '#3BE3A0' : last === 'L' ? '#FF8A96' : '#9AA6C7'
              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="num w-3.5 text-xs text-[var(--muted)]">{i + 1}</span>
                      <span className="avatar size-[30px] text-sm">{initials(r.name)}</span>
                      <span className="font-semibold whitespace-nowrap text-[var(--ink)]">{r.name}</span>
                    </div>
                  </td>
                  <td>
                    <strong className="text-[var(--ink)]">{r.won}</strong>
                    <span className="text-[var(--dim)]">/{r.played}</span>
                  </td>
                  <td>{Math.round(r.winRate * 100)} %</td>
                  <td className="text-[var(--warn)]">{r.mvps || ''}</td>
                  <td>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="form"
                        aria-label={`Últimos resultados: ${r.form.map((o) => FORM[o].t).join(' ')}`}
                      >
                        {recent.map((o, j) => (
                          <i key={j} className={FORM[o].c}>
                            {FORM[o].t}
                          </i>
                        ))}
                      </div>
                      {last && (
                        <span className="text-[10px] font-bold" style={{ color: streakColor }}>
                          {streak}
                          {FORM[last].t}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
