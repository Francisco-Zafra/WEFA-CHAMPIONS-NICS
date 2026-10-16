import { ChevronLeft, Filter } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Kit } from '@/components/Kit'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PlayerCard } from '@/components/PlayerCard'
import { EmptyCards } from '@/components/States'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import type { Cup } from '@/domain/cup'
import { dateLabel } from '@/domain/filters'
import { hasScorers, scorerTable } from '@/domain/goals'
import { talisman, timeline } from '@/domain/insights'
import { gamesOf, playerProfile, streakLabel, type PlayerGame, type Relation } from '@/domain/profile'
import { tier } from '@/domain/rating'
import type { Match, Player } from '@/domain/types'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useShowMatches, useStatsData } from '@/hooks/useStatsData'
import { cx } from '@/lib/cx'
import type { Collection } from '@/lib/data'
import { FilterButton, FilterChips, FilterSheet } from './stats/Filters'
import { FormDots } from './stats/bits'

type Tab = 'resumen' | 'goles' | 'evo' | 'comp' | 'riv' | 'clubes' | 'part'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
const pct = (v: number) => `${Math.round(v * 100)} %`
const dec = (v: number) => v.toFixed(2).replace('.', ',')

function Kpi({
  label,
  value,
  color,
  hint,
  onClick,
}: {
  label: string
  value: ReactNode
  color?: string
  hint?: ReactNode
  onClick?: () => void
}) {
  const body = (
    <>
      <b style={color ? { color } : undefined}>{value}</b>
      <span>{label}</span>
      {hint && <em>{hint}</em>}
    </>
  )
  return onClick ? (
    <button className="kpi2 rowbtn" type="button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="kpi2">{body}</div>
  )
}

function Relations({
  rows,
  tone,
  label,
  verb,
  byId,
}: {
  rows: Relation[]
  tone: 'good' | 'bad'
  label: string
  verb: (r: Relation) => string
  byId: Map<string, Player>
}) {
  return (
    <div className="flex flex-col">
      <p className="lbl2" style={{ color: tone === 'good' ? 'var(--win)' : '#FF8A96' }}>
        {label}
      </p>
      {rows.length === 0 ? (
        <p className="small py-2 text-[13px]">Nadie todavía.</p>
      ) : (
        rows.map((r, i) => (
          <Link key={r.id} className="mate" to={`/jugador/${r.id}`}>
            <span className="n">
              <PlayerAvatar player={byId.get(r.id) ?? { name: r.name }} />
              {byId.get(r.id)?.name ?? r.name}
            </span>
            <span
              className="v"
              style={i === 0 ? { color: tone === 'good' ? 'var(--win)' : '#FF8A96' } : undefined}
            >
              {pct(r.winRate)}
            </span>
            <span className="s">{verb(r)}</span>
          </Link>
        ))
      )}
    </div>
  )
}

function Evolution({
  games,
  playerId,
  goalsMode,
}: {
  games: PlayerGame[]
  playerId: string
  goalsMode: boolean
}) {
  const withGoals = games.filter((g) => hasScorers(g.match))
  let acc = 0
  // % de victorias acumulado, o goles acumulados en los partidos con goleadores
  const values = goalsMode
    ? withGoals.map((g) => (acc += g.match.goals!.byPlayer[playerId] ?? 0))
    : timeline(games).map((p) => p.winRate)
  if (values.length < 2)
    return (
      <p className="small">
        Hacen falta al menos dos partidos{goalsMode ? ' con goleadores' : ''} para dibujar la gráfica.
      </p>
    )
  const max = goalsMode ? Math.max(1, ...values) : 1
  const xy = values.map((v, i) => [10 + (i * 320) / (values.length - 1), 150 - (v / max) * 140] as const)
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]!
  const end = goalsMode ? `${values.at(-1)} goles` : pct(values.at(-1)!)
  const first = (goalsMode ? withGoals : games)[0]!.match.date
  const lastDate = (goalsMode ? withGoals : games).at(-1)!.match.date
  return (
    <svg
      className="chart"
      viewBox="0 0 340 170"
      role="img"
      aria-label={
        goalsMode
          ? `Goles acumulados: ${end}`
          : `Porcentaje de victorias acumulado partido a partido; termina en ${end}`
      }
    >
      {!goalsMode && (
        <>
          <line x1="10" y1="80" x2="330" y2="80" stroke="rgba(170,190,255,.25)" strokeDasharray="3 4" />
          <text x="12" y="76" fontSize="9" fill="#6F7BA0">
            50 %
          </text>
        </>
      )}
      <line x1="10" y1="150" x2="330" y2="150" stroke="rgba(170,190,255,.15)" />
      <polyline
        points={`10,150 ${line} ${last[0]},150`}
        fill={goalsMode ? 'rgba(59,227,160,.16)' : 'rgba(155,123,255,.16)'}
        stroke="none"
      />
      <polyline
        points={line}
        fill="none"
        stroke={goalsMode ? '#3BE3A0' : '#9B7BFF'}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r="4.5"
        fill="#fff"
        stroke={goalsMode ? '#3BE3A0' : '#9B7BFF'}
        strokeWidth="2.5"
      />
      <text
        x={last[0]}
        y={Math.max(12, last[1] - 10)}
        fontSize="12"
        fontWeight="700"
        fill="#EEF2FF"
        textAnchor="end"
      >
        {end}
      </text>
      <text x="10" y="166" fontSize="9" fill="#6F7BA0">
        {dayMonth(first)}
      </text>
      <text x="330" y="166" fontSize="9" fill="#6F7BA0" textAnchor="end">
        {dayMonth(lastDate)}
      </text>
    </svg>
  )
}

export function PlayerProfilePage({
  players,
  matches,
  cups,
}: {
  players: Collection<Player>
  /** Amistosos y cruces de copa jugados */
  matches: Collection<Match>
  cups: Collection<Cup>
}) {
  const { id = '' } = useParams()
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const show = useShowMatches()
  const data = useStatsData(matches.data, players.data, cups.data)
  const [tab, setTab] = useState<Tab>('resumen')
  const [goalsMode, setGoalsMode] = useState(false)
  const [sheet, setSheet] = useState(false)
  const { filtered, filter, nameMap } = data
  const player = players.data.find((p) => p.id === id)
  const profile = useMemo(
    () => playerProfile(filtered, id, filter.mins.mates),
    [filtered, id, filter.mins.mates],
  )
  const games = useMemo(() => gamesOf(filtered, id), [filtered, id])
  const scorers = useMemo(() => scorerTable(filtered, nameMap), [filtered, nameMap])
  const lucky = useMemo(() => talisman(games), [games])

  if (players.loading || matches.loading)
    return <div className="skel h-[420px] rounded-[24px]" aria-busy="true" />
  if (!player)
    return (
      <EmptyCards
        title="Jugador no encontrado"
        action={
          <Link className="btn btn--primary mt-1.5 h-[52px]" to="/estadisticas/jugadores">
            Ver el ranking
          </Link>
        }
      >
        Puede que se haya dado de baja.
      </EmptyCards>
    )

  const byId = new Map(players.data.map((p) => [p.id, p]))
  const goals = scorers.find((r) => r.id === id)
  const rank = goals && goals.goals > 0 ? scorers.findIndex((r) => r.id === id) + 1 : 0
  const withScorers = goals?.played ?? 0
  const filterText = dateLabel(filter.dates) ?? 'Todos los partidos'
  const allGames = () =>
    show(
      games.map((g) => g.match),
      `Partidos de ${player.name}`,
    )
  const outcomeGames = (o: 'W' | 'D' | 'L', title: string) => () =>
    show(
      games.filter((g) => g.outcome === o).map((g) => g.match),
      `${title} de ${player.name}`,
    )

  const summaryLine = (
    <p className="small text-[13px]">
      <strong className="text-[var(--ink)]">{pct(profile.winRate)}</strong> victorias ·{' '}
      <span className="text-[var(--gold)]">{profile.mvps} MVP</span>
      {goals && goals.goals > 0 && (
        <>
          {' '}
          · <span className="text-[#9FF3CF]">{goals.goals} goles</span>
        </>
      )}
    </p>
  )

  const resumen = (
    <>
      <div
        className={desktop ? 'kpis grid-cols-6' : 'kpis grid-cols-3'}
        style={{ gridTemplateColumns: `repeat(${desktop ? 6 : 3}, minmax(0, 1fr))` }}
      >
        <Kpi label="Partidos" value={profile.played} onClick={allGames} />
        <Kpi
          label="Victorias"
          value={profile.won}
          color="var(--win)"
          onClick={outcomeGames('W', 'Victorias')}
        />
        <Kpi
          label="Emp. · derr."
          value={`${profile.drawn} · ${profile.lost}`}
          onClick={outcomeGames('L', 'Derrotas')}
        />
        <Kpi label="MVP" value={profile.mvps} color="var(--gold)" />
        <Kpi label="Mejor racha" value={`${profile.bestWinStreak}V`} />
        <Kpi
          label="Racha actual"
          value={streakLabel(profile.streak) || '–'}
          color={
            profile.streak?.kind === 'W' ? 'var(--win)' : profile.streak?.kind === 'L' ? '#FF8A96' : undefined
          }
        />
      </div>
      <div className="kpis">
        <Kpi
          label="Goles de su equipo"
          value={`${profile.goalsFor} · ${profile.goalsAgainst}`}
          hint="a favor · en contra"
        />
        <div className="kpi2">
          <span>Forma reciente</span>
          <FormDots form={profile.form} className="mt-2" />
        </div>
      </div>
    </>
  )

  const golesEl =
    withScorers === 0 ? (
      <p className="small text-[13px]">Ninguno de sus partidos con este filtro tiene goleadores apuntados.</p>
    ) : (
      <>
        <span className="pillnote self-start">
          <span className="ball" aria-hidden style={{ color: '#9FF3CF' }} />
          Sobre {withScorers} {withScorers === 1 ? 'partido' : 'partidos'} con goleadores
        </span>
        <div
          className="kpis"
          style={desktop ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } : undefined}
        >
          <Kpi
            label="Goles"
            value={goals!.goals}
            hint={rank ? `${rank}.º del Pichichi` : undefined}
            onClick={() =>
              show(
                games
                  .filter((g) => hasScorers(g.match) && (g.match.goals!.byPlayer[id] ?? 0) > 0)
                  .map((g) => g.match),
                `Partidos con gol de ${player.name}`,
              )
            }
          />
          <Kpi label="Por partido" value={dec(goals!.perMatch)} />
          <Kpi
            label="Mejor partido"
            value={goals!.best?.goals ?? 0}
            hint={
              goals!.best &&
              `${dayMonth(goals!.best.match.date)} · ${getClub(goals!.best.match.clubA).short} ${goals!.best.match.scoreA}–${goals!.best.match.scoreB} ${getClub(goals!.best.match.clubB).short}`
            }
            onClick={goals!.best ? () => navigate(`/historial/${goals!.best!.match.id}`) : undefined}
          />
          <Kpi
            label="Racha marcando"
            value={goals!.streak}
            hint={
              goals!.hatTricks
                ? `${goals!.hatTricks} hat-trick${goals!.hatTricks > 1 ? 's' : ''}`
                : 'partidos seguidos'
            }
          />
        </div>
      </>
    )

  const evo = (
    <>
      {withScorers > 1 && (
        <div className="seg" role="group" aria-label="Gráfica">
          <button type="button" aria-pressed={!goalsMode} onClick={() => setGoalsMode(false)}>
            % victorias
          </button>
          <button type="button" aria-pressed={goalsMode} onClick={() => setGoalsMode(true)}>
            Goles
          </button>
        </div>
      )}
      <Evolution games={games} playerId={id} goalsMode={goalsMode && withScorers > 1} />
      <p className="note">Sigue al filtro activo.</p>
    </>
  )

  const mates = (
    <>
      <Relations
        rows={profile.bestPartners}
        tone="good"
        label="Con quién gana más"
        verb={(r) => `${r.won} de ${r.played} juntos`}
        byId={byId}
      />
      <Relations
        rows={profile.worstPartners}
        tone="bad"
        label="Con quién menos"
        verb={(r) => `${r.won} de ${r.played} juntos`}
        byId={byId}
      />
      <p className="note">Mínimo {filter.mins.mates} partidos juntos.</p>
    </>
  )
  const rivals = (
    <>
      <Relations
        rows={profile.victims}
        tone="good"
        label="Sus víctimas"
        verb={(r) => `Le gana ${r.won} de ${r.played}`}
        byId={byId}
      />
      <Relations
        rows={profile.nemeses}
        tone="bad"
        label="Sus bestias negras"
        verb={(r) => `Le gana ${r.won} de ${r.played}`}
        byId={byId}
      />
      <p className="note">Mínimo {filter.mins.mates} partidos enfrentados.</p>
    </>
  )
  const clubs = (
    <>
      {profile.clubs.map((c) => (
        <div key={c.club} className="clubrow">
          <Crest club={c.club} size={30} />
          <span className="flex min-w-0 items-center gap-1.5 font-semibold text-[var(--ink)]">
            <span className="truncate">{getClub(c.club).short}</span>
            {c.club === lucky && <span className="feat">Talismán</span>}
          </span>
          <div className="hbar">
            <i style={{ width: `${(c.won / c.played) * 100}%`, background: '#9B7BFF' }} />
          </div>
          <span className="text-right tabular-nums">
            {c.won}/{c.played} · {pct(c.won / c.played)}
          </span>
        </div>
      ))}
      <p className="note">
        Talismán: el club con el que más gana (mín. 2 partidos), si gana más que en general.
      </p>
    </>
  )
  const recent = [...games].reverse()
  const partidos = (
    <>
      {recent.slice(0, desktop ? 8 : 6).map((g) => {
        const side = g.match.teamA.some((p) => p.id === id) ? 'A' : 'B'
        const n = g.match.goals?.byPlayer[id] ?? 0
        const [gf, ga] = side === 'A' ? [g.match.scoreA, g.match.scoreB] : [g.match.scoreB, g.match.scoreA]
        return (
          <Link key={g.match.id} className="lm" to={`/historial/${g.match.id}`}>
            <span className={`res res--${g.outcome === 'W' ? 'w' : g.outcome === 'D' ? 'd' : 'l'}`}>
              {g.outcome === 'W' ? 'V' : g.outcome === 'D' ? 'E' : 'D'}
            </span>
            <span className="min-w-0">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <Kit side={side} className="size-3.5" />
                {getClub(g.club).short}
              </span>{' '}
              · {dayMonth(g.match.date)}
              {n > 0 && (
                <>
                  {' '}
                  · <span className="ball" aria-hidden /> ×{n}
                </>
              )}
              <br />
              <span className="block truncate">
                con {g.mates.map((p) => byId.get(p.id)?.name ?? p.name).join(', ') || 'nadie'}
              </span>
            </span>
            <b>
              {gf}–{ga}
            </b>
          </Link>
        )
      })}
      {games.length > (desktop ? 8 : 6) && (
        <button className="btn btn--ghost btn--sm self-center" type="button" onClick={allGames}>
          Ver los {games.length}
        </button>
      )}
    </>
  )

  const actions = (
    <>
      <button
        className="btn btn--glass btn--sm"
        type="button"
        onClick={() => data.setFilter({ ...filter, players: [id] })}
      >
        <Filter /> Filtrar por {player.name.split(' ')[0]}
      </button>
      <button
        className="btn btn--glass btn--sm"
        type="button"
        onClick={() => navigate('/estadisticas/comparar', { state: { a: id } })}
      >
        Comparar con…
      </button>
    </>
  )
  const sheetEl = (
    <FilterSheet
      open={sheet}
      onClose={() => setSheet(false)}
      data={data}
      matches={matches.data}
      players={players.data}
      cups={cups.data}
    />
  )

  if (desktop)
    return (
      <div className="flex flex-col gap-6">
        <Link className="btn btn--ghost btn--sm self-start pl-1" to="/estadisticas/jugadores">
          <ChevronLeft /> Estadísticas · Jugadores
        </Link>
        <header className="flex flex-wrap items-center gap-6">
          <PlayerCard player={player} size={9} off={!player.active} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="h-display text-[64px] leading-none">{player.name}</h1>
            {summaryLine}
            <div className="flex flex-wrap gap-2">{actions}</div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips data={data} />
              <FilterButton count={data.chips.length} onClick={() => setSheet(true)} />
              <span className="fcount">
                <strong>{profile.played}</strong> partidos suyos de {filtered.length}
              </span>
            </div>
          </div>
        </header>
        {profile.played === 0 ? (
          <p className="body-text">Sin partidos con este filtro.</p>
        ) : (
          <>
            {resumen}
            <div className="grid grid-cols-2 gap-8">
              <section className="flex flex-col gap-2.5">
                <h2 className="h-display h-m">Evolución</h2>
                {evo}
              </section>
              <section className="flex flex-col gap-2.5">
                <h2 className="h-display h-m">Sus goles</h2>
                {golesEl}
              </section>
            </div>
            <div className="grid grid-cols-3 gap-8">
              <section className="flex flex-col gap-1">
                <div className="card__h">
                  <h2 className="h-display h-m">Compañeros</h2>
                </div>
                {mates}
              </section>
              <section className="flex flex-col gap-1">
                <h2 className="h-display h-m">Rivales</h2>
                {rivals}
              </section>
              <section className="flex flex-col gap-1">
                <h2 className="h-display h-m">Sus clubes</h2>
                {clubs}
              </section>
            </div>
            <section className="flex flex-col gap-1">
              <h2 className="h-display h-m">Últimos partidos</h2>
              {partidos}
            </section>
          </>
        )}
        {sheetEl}
      </div>
    )

  const TABS: [Tab, string][] = [
    ['resumen', 'Resumen'],
    ['goles', 'Goles'],
    ['evo', 'Evolución'],
    ['comp', 'Compañeros'],
    ['riv', 'Rivales'],
    ['clubes', 'Clubes'],
    ['part', 'Partidos'],
  ]
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <Link className="btn btn--ghost btn--sm pl-1" to="/estadisticas/jugadores">
          <ChevronLeft /> Jugadores
        </Link>
        <div className="flex gap-1.5">
          <button
            className="btn btn--glass btn--sm"
            type="button"
            onClick={() => navigate('/estadisticas/comparar', { state: { a: id } })}
          >
            Comparar
          </button>
          <FilterButton count={data.chips.length} label={false} onClick={() => setSheet(true)} />
        </div>
      </div>
      <header className="flex items-center gap-3.5">
        <span
          className={cx('ovr-shield', `ovr-shield--${tier(player.rating)}`)}
          aria-label={`Media ${player.rating}`}
        >
          <b>{player.rating}</b>
          <span>MED</span>
        </span>
        <div className="min-w-0">
          <h1 className="h-display h-xl truncate">{player.name}</h1>
          {summaryLine}
          <p className="note mt-1">
            {filterText} · {profile.played} partidos de {filtered.length}
          </p>
        </div>
      </header>
      <div className="subtabs -mx-[18px] px-2.5" role="tablist" aria-label="Apartados de la ficha">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            className="subtab"
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 pt-1" role="tabpanel">
        {profile.played === 0 ? (
          <p className="body-text">Sin partidos con este filtro.</p>
        ) : (
          <>
            {tab === 'resumen' && resumen}
            {tab === 'goles' && golesEl}
            {tab === 'evo' && evo}
            {tab === 'comp' && mates}
            {tab === 'riv' && rivals}
            {tab === 'clubes' && clubs}
            {tab === 'part' && partidos}
          </>
        )}
      </div>
      {sheetEl}
    </div>
  )
}
