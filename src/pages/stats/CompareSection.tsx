import { Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Kit } from '@/components/Kit'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Crest } from '@/components/ui'
import { CLUBS, getClub } from '@/domain/clubs'
import { clubComparison, formatCompare, playerComparison, rowWinner, type CompareRow } from '@/domain/compare'
import type { Cup } from '@/domain/cup'
import { frequentDuels, headToHead, timeline } from '@/domain/insights'
import { gamesOf, rivalries } from '@/domain/profile'
import { isPlayed } from '@/domain/standings'
import type { ClubId, Match, Player } from '@/domain/types'
import { useShowMatches, type StatsData } from '@/hooks/useStatsData'
import { cx } from '@/lib/cx'
import { BlockHead, SubSeg } from './bits'

const A_COLOR = '#9B7BFF'
const B_COLOR = '#FFC857'
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`

type Mode = 'players' | 'clubs'

function Rows({ rows }: { rows: CompareRow[] }) {
  return (
    <div>
      {rows.map((r) => {
        const w = rowWinner(r)
        const m = Math.max(r.a, r.b) || 1
        return (
          <div key={r.label} className="cmp">
            <span className={cx('a', w === 'a' && 'w')}>{formatCompare(r.a, r.format)}</span>
            <div className="hbar hbar--l" style={{ height: 6 }}>
              <i
                style={{ width: `${(r.a / m) * 100}%`, background: A_COLOR, opacity: w === 'a' ? 1 : 0.45 }}
              />
            </div>
            <span className="k">{r.label}</span>
            <div className="hbar" style={{ height: 6 }}>
              <i
                style={{ width: `${(r.b / m) * 100}%`, background: B_COLOR, opacity: w === 'b' ? 1 : 0.45 }}
              />
            </div>
            <span className={cx('b', w === 'b' && 'w')}>{formatCompare(r.b, r.format)}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Marcador de enfrentados: victorias de cada uno, empates y barra */
function VersusScore({
  winsA,
  drawn,
  winsB,
  nameA,
  nameB,
}: {
  winsA: number
  drawn: number
  winsB: number
  nameA: string
  nameB: string
}) {
  const played = winsA + drawn + winsB
  const dom =
    winsA === winsB
      ? 'Igualadísimo'
      : `Domina ${winsA > winsB ? nameA : nameB}${Math.abs(winsA - winsB) === 1 ? ', por la mínima' : ''}`
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end text-center">
        <div>
          <div className="h-display text-5xl" style={{ color: '#C9BBFF' }}>
            {winsA}
          </div>
          <div className="note">{nameA} gana</div>
        </div>
        <div className="px-2.5">
          <div className="h-display text-[28px] text-[var(--muted)]">{drawn}</div>
          <div className="note">{drawn === 1 ? 'empate' : 'empates'}</div>
        </div>
        <div>
          <div className="h-display text-5xl" style={{ color: B_COLOR }}>
            {winsB}
          </div>
          <div className="note">{nameB} gana</div>
        </div>
      </div>
      <div className="split" aria-hidden>
        <i style={{ flex: Math.max(winsA, 0.0001), background: A_COLOR }} />
        <i style={{ flex: Math.max(drawn, 0.0001), background: '#59617D' }} />
        <i style={{ flex: Math.max(winsB, 0.0001), background: B_COLOR }} />
      </div>
      <p className="small text-center text-[13px]">
        <strong className="text-[var(--ink)]">{dom}</strong> · {played}{' '}
        {played === 1 ? 'partido' : 'partidos'}
      </p>
    </div>
  )
}

/** Fila de un partido entre los dos */
function DuelMatch({
  m,
  a,
  b,
  nameA,
  nameB,
}: {
  m: Match
  a: string
  b: string
  nameA: string
  nameB: string
}) {
  const sideOf = (id: string) => (m.teamA.some((p) => p.id === id) ? 'A' : 'B')
  const sa = sideOf(a)
  const sb = sideOf(b)
  const together = sa === sb
  return (
    <Link className="mm" to={`/historial/${m.id}`}>
      <span className="note">{dayMonth(m.date)}</span>
      {together ? (
        <span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
            <Kit side={sa} className="size-3.5" />
            Juntos · {getClub(sa === 'A' ? m.clubA : m.clubB).short}
          </span>
          <br />
          <span className="note">contra {getClub(sa === 'A' ? m.clubB : m.clubA).name}</span>
        </span>
      ) : (
        <span>
          <span className="inline-flex items-center gap-1">
            <Kit side={sa} className="size-3.5" />
            {nameA}
          </span>{' '}
          contra{' '}
          <span className="inline-flex items-center gap-1">
            <Kit side={sb} className="size-3.5" />
            {nameB}
          </span>
        </span>
      )}
      <b>
        {m.scoreA}–{m.scoreB}
      </b>
    </Link>
  )
}

function Picker({
  side,
  mode,
  value,
  options,
  onChange,
  avatar,
}: {
  side: 'a' | 'b'
  mode: Mode
  value: string | null
  options: { id: string; name: string }[]
  onChange: (id: string) => void
  avatar?: Player['avatar']
}) {
  const name = options.find((o) => o.id === value)?.name
  const what = mode === 'players' ? 'jugador' : 'club'
  return (
    <label className={cx('cmp-pick', value ? `cmp-pick--${side}` : 'cmp-pick--empty')}>
      {value &&
        (mode === 'players' ? (
          <PlayerAvatar player={{ name: name ?? '', avatar: avatar ?? null }} className="size-8 text-sm" />
        ) : (
          <Crest club={value as ClubId} size={32} />
        ))}
      <span className="n">{name ?? `+ ${what[0]!.toUpperCase()}${what.slice(1)}`}</span>
      <select
        aria-label={side === 'a' ? `Primer ${what}` : `Segundo ${what}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Elige un {what}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CompareSection({
  data,
  players,
  cups,
  desktop,
}: {
  data: StatsData
  players: Player[]
  cups: Cup[]
  desktop: boolean
}) {
  const { filtered, names } = data
  const location = useLocation()
  const preset = (location.state as { a?: string } | null)?.a
  const [mode, setMode] = useState<Mode>('players')
  const [ids, setIds] = useState<Record<Mode, [string | null, string | null]>>(() => ({
    players: [preset ?? data.filter.players[0] ?? null, data.filter.players[1] ?? null],
    clubs: [data.filter.clubs[0] ?? null, data.filter.clubs[1] ?? null],
  }))
  const [tab, setTab] = useState<'cifras' | 'vs' | 'juntos'>('cifras')
  const show = useShowMatches()
  const [a, b] = ids[mode]
  const setSide = (i: 0 | 1) => (id: string) =>
    setIds((s) => {
      const pair: [string | null, string | null] = [...s[mode]]
      pair[i] = id
      if (pair[0] === pair[1]) pair[i === 0 ? 1 : 0] = null
      return { ...s, [mode]: pair }
    })

  const options = useMemo(() => {
    if (mode === 'clubs') return CLUBS.map((c) => ({ id: c.id as string, name: c.name }))
    const seen = new Set(filtered.flatMap((m) => [...m.teamA, ...m.teamB]).map((p) => p.id))
    return players
      .filter((p) => seen.has(p.id))
      .map((p) => ({ id: p.id, name: p.name }))
      .sort((x, y) => x.name.localeCompare(y.name, 'es'))
  }, [mode, filtered, players])
  const avatarOf = (id: string | null) => players.find((p) => p.id === id)?.avatar ?? null
  const nameOf = (id: string) => (mode === 'players' ? names.player(id) : getClub(id as ClubId).short)

  const pickers = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <Picker side="a" mode={mode} value={a} options={options} onChange={setSide(0)} avatar={avatarOf(a)} />
      <span className="h-display text-xl text-[var(--muted)]">vs</span>
      <Picker side="b" mode={mode} value={b} options={options} onChange={setSide(1)} avatar={avatarOf(b)} />
    </div>
  )
  const modeSeg = (
    <div className="seg" role="group" aria-label="Qué comparar">
      <button type="button" aria-pressed={mode === 'players'} onClick={() => setMode('players')}>
        Dos jugadores
      </button>
      <button type="button" aria-pressed={mode === 'clubs'} onClick={() => setMode('clubs')}>
        Dos clubes
      </button>
    </div>
  )

  if (!a || !b) {
    const duels = mode === 'players' ? frequentDuels(filtered, players) : []
    return (
      <div className="flex flex-col gap-3.5">
        {modeSeg}
        {pickers}
        <div className="empty">
          <span className="empty__ic">
            <Scale />
          </span>
          <h3 className="h-display h-m">Elige a dos</h3>
          <p className="body-text max-w-sm">
            Verás sus cifras lado a lado
            {mode === 'players'
              ? ', cuántas veces se han ganado y cómo les va juntos.'
              : ' y cómo les va cara a cara.'}
          </p>
          {duels.length > 0 && (
            <>
              <p className="eyebrow mt-1.5">Duelos más repetidos</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {duels.map(([x, y]) => (
                  <button
                    key={`${x}-${y}`}
                    className="pill cursor-pointer"
                    type="button"
                    onClick={() => setIds((s) => ({ ...s, players: [x, y] }))}
                  >
                    {names.player(x)} vs {names.player(y)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const rows =
    mode === 'players'
      ? playerComparison(filtered, a, b)
      : clubComparison(filtered, cups, a as ClubId, b as ClubId)
  const nameA = nameOf(a)
  const nameB = nameOf(b)

  let versus: { winsA: number; drawn: number; winsB: number; games: Match[] }
  let together: ReturnType<typeof headToHead>['together'] | null = null
  let togetherGames: Match[] = []
  if (mode === 'players') {
    const h = headToHead(filtered, a, b)
    versus = {
      winsA: h.against.winsA,
      drawn: h.against.drawn,
      winsB: h.against.winsB,
      games: h.games.filter((g) => !g.together).map((g) => g.match),
    }
    together = h.together
    togetherGames = h.games.filter((g) => g.together).map((g) => g.match)
  } else {
    const r = rivalries(filtered).find((x) => [x.a, x.b].sort().join() === [a, b].sort().join())
    const flip = r?.a !== a
    versus = {
      winsA: r ? (flip ? r.winsB : r.winsA) : 0,
      drawn: r?.drawn ?? 0,
      winsB: r ? (flip ? r.winsA : r.winsB) : 0,
      games: filtered
        .filter((m) => isPlayed(m) && [m.clubA, m.clubB].sort().join() === [a, b].sort().join())
        .sort((x, y) => y.date.localeCompare(x.date)),
    }
  }

  const versusEl =
    versus.games.length === 0 ? (
      <p className="small">No se han enfrentado con este filtro.</p>
    ) : (
      <>
        <VersusScore
          winsA={versus.winsA}
          drawn={versus.drawn}
          winsB={versus.winsB}
          nameA={nameA}
          nameB={nameB}
        />
        {mode === 'players'
          ? versus.games
              .slice(0, 5)
              .map((m) => <DuelMatch key={m.id} m={m} a={a} b={b} nameA={nameA} nameB={nameB} />)
          : versus.games.slice(0, 5).map((m) => (
              <Link key={m.id} className="mm" to={`/historial/${m.id}`}>
                <span className="note">{dayMonth(m.date)}</span>
                <span>
                  {getClub(m.clubA).short} contra {getClub(m.clubB).short}
                  {m.cup && <span className="note"> · {m.cup.label}</span>}
                </span>
                <b>
                  {m.scoreA}–{m.scoreB}
                </b>
              </Link>
            ))}
        {versus.games.length > 5 && (
          <button
            className="btn btn--ghost btn--sm self-center"
            type="button"
            onClick={() => show(versus.games, `${nameA} contra ${nameB}`)}
          >
            Ver los {versus.games.length}
          </button>
        )}
      </>
    )

  const togetherEl =
    together && together.played > 0 ? (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <div className="kpi2">
            <b style={{ color: 'var(--win)' }}>{together.won}</b>
            <span>V</span>
          </div>
          <div className="kpi2">
            <b>{together.drawn}</b>
            <span>E</span>
          </div>
          <div className="kpi2">
            <b style={{ color: 'var(--loss)' }}>{together.lost}</b>
            <span>D</span>
          </div>
          <div className="kpi2">
            <b>{Math.round((together.won / together.played) * 100)} %</b>
            <span>Ganan</span>
          </div>
        </div>
        <p className="small text-[13px]">
          {together.played} {together.played === 1 ? 'partido' : 'partidos'} en el mismo equipo.
        </p>
        {togetherGames.slice(0, 5).map((m) => (
          <DuelMatch key={m.id} m={m} a={a} b={b} nameA={nameA} nameB={nameB} />
        ))}
      </>
    ) : (
      <p className="small">No han jugado juntos con este filtro.</p>
    )

  const cifras = (
    <>
      <Rows rows={rows} />
      <p className="note">En negrita, quién gana cada cifra.</p>
    </>
  )

  if (desktop) {
    const lines =
      mode === 'players'
        ? [a, b].map((id, i) => ({
            color: i === 0 ? A_COLOR : B_COLOR,
            pts: timeline(gamesOf(filtered, id)),
          }))
        : []
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-5">
          <div className="w-[340px]">{modeSeg}</div>
          <div className="min-w-[320px] flex-1">{pickers}</div>
        </div>
        <div className="grid items-start gap-8 @4xl:grid-cols-2">
          <section className="flex flex-col gap-2">
            <BlockHead title="Cifras" />
            {cifras}
          </section>
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2.5">
              <BlockHead title="Enfrentados" note={`${versus.games.length} partidos`} />
              {versusEl}
            </section>
            {mode === 'players' && (
              <section className="flex flex-col gap-2.5">
                <BlockHead title="Juntos" note={`${together?.played ?? 0} partidos`} />
                {togetherEl}
              </section>
            )}
            {lines.some((l) => l.pts.length > 1) && (
              <section className="flex flex-col gap-2">
                <BlockHead small title="% de victorias en el tiempo" note="Sigue al filtro" />
                <svg
                  className="chart"
                  viewBox="0 0 340 170"
                  role="img"
                  aria-label={`Porcentaje de victorias acumulado de ${nameA} y ${nameB}`}
                >
                  <line
                    x1="10"
                    y1="80"
                    x2="330"
                    y2="80"
                    stroke="rgba(170,190,255,.25)"
                    strokeDasharray="3 4"
                  />
                  <text x="332" y="76" fontSize="9" fill="#6F7BA0" textAnchor="end">
                    50 %
                  </text>
                  {lines.map((l) => (
                    <polyline
                      key={l.color}
                      points={l.pts
                        .map(
                          (p, i) =>
                            `${(10 + (i * 320) / Math.max(1, l.pts.length - 1)).toFixed(1)},${(150 - p.winRate * 140).toFixed(1)}`,
                        )
                        .join(' ')}
                      fill="none"
                      stroke={l.color}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                <div className="flex gap-4 text-xs font-semibold text-[var(--ink-2)]">
                  {lines.map((l, i) => (
                    <span key={l.color} className="flex items-center gap-1.5">
                      <i className="block h-[3px] w-4 rounded" style={{ background: l.color }} />
                      {i === 0 ? nameA : nameB} {Math.round((l.pts.at(-1)?.winRate ?? 0) * 100)} %
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {modeSeg}
      {pickers}
      <SubSeg
        label="Apartados"
        value={mode === 'clubs' && tab === 'juntos' ? 'cifras' : tab}
        onChange={setTab}
        options={[
          { value: 'cifras', label: 'Cifras' },
          { value: 'vs', label: 'Enfrentados' },
          ...(mode === 'players' ? [{ value: 'juntos' as const, label: 'Juntos' }] : []),
        ]}
      />
      {tab === 'cifras' || (mode === 'clubs' && tab === 'juntos')
        ? cifras
        : tab === 'vs'
          ? versusEl
          : togetherEl}
    </div>
  )
}
