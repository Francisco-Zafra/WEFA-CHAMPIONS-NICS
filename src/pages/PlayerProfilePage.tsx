import { ChevronLeft, Flame, Sparkles, Star } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PlayerCard } from '@/components/PlayerCard'
import { EmptyCards } from '@/components/States'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { talisman, timeline, type TimelinePoint } from '@/domain/insights'
import { gamesOf, playerProfile, type Relation } from '@/domain/profile'
import type { Outcome } from '@/domain/standings'
import type { Match, Player } from '@/domain/types'
import { cx } from '@/lib/cx'
import type { Collection } from '@/lib/data'

const FORM: Record<Outcome, { c: string; t: string }> = {
  W: { c: 'w', t: 'V' },
  D: { c: 'd', t: 'E' },
  L: { c: 'l', t: 'D' },
}

const dayMonth = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

export function PlayerProfilePage({
  players,
  matches,
}: {
  players: Collection<Player>
  matches: Collection<Match>
}) {
  const { id } = useParams()
  const player = players.data.find((p) => p.id === id)
  const profile = useMemo(() => (id ? playerProfile(matches.data, id) : null), [matches.data, id])
  const games = useMemo(() => (id ? gamesOf(matches.data, id) : []), [matches.data, id])
  const points = useMemo(() => timeline(games), [games])
  const lucky = useMemo(() => talisman(games), [games])

  if (players.loading || matches.loading)
    return <div className="skel h-[420px] rounded-[24px]" aria-busy="true" />
  if (!player || !profile)
    return (
      <EmptyCards
        title="Jugador no encontrado"
        action={
          <Link className="btn btn--primary mt-1.5 h-[52px]" to="/plantilla">
            Ver la plantilla
          </Link>
        }
      >
        Puede que se haya dado de baja.
      </EmptyCards>
    )

  const byId = new Map(players.data.map((p) => [p.id, p]))
  const streakText =
    profile.streak &&
    `${profile.streak.count} ${profile.streak.kind === 'W' ? 'victorias' : profile.streak.kind === 'D' ? 'empates' : 'derrotas'} seguidas`

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <Link className="btn btn--glass btn--icon" to="/plantilla" aria-label="Volver a la plantilla">
          <ChevronLeft />
        </Link>
        <div className="min-w-0">
          <p className="eyebrow">Ficha de jugador</p>
          <h1 className="h-display h-xl mt-1 truncate lg:text-[56px]">{player.name}</h1>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="mx-auto lg:mx-0">
          <PlayerCard player={player} size={13} off={!player.active} />
        </div>

        <div className="flex flex-col gap-4">
          {profile.played === 0 ? (
            <div className="glass p-5">
              <h2 className="h-display h-m">Sin partidos todavía</h2>
              <p className="small mt-1">
                Cuando juegue algún partido con resultado aparecerán aquí sus estadísticas, con quién gana más
                y contra quién sufre.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Kpi label="Partidos" value={profile.played} />
                <Kpi label="Victorias" value={profile.won} tone="ok" />
                <Kpi label="Empates / derrotas" value={`${profile.drawn} / ${profile.lost}`} />
                <Kpi label="% victorias" value={`${Math.round(profile.winRate * 100)} %`} accent />
                <Kpi
                  label="MVP"
                  value={profile.mvps}
                  tone="gold"
                  icon={<Star className="size-4" fill="currentColor" />}
                />
                <Kpi
                  label="Goles a favor / en contra"
                  value={`${profile.goalsFor} / ${profile.goalsAgainst}`}
                />
                <Kpi label="Mejor racha de victorias" value={profile.bestWinStreak} />
                <Kpi
                  label="Racha actual"
                  value={profile.streak ? profile.streak.count : '–'}
                  hint={profile.streak ? FORM[profile.streak.kind].t : undefined}
                />
              </div>
              <div className="glass flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="label">Forma reciente</span>
                <span className="form">
                  {profile.form.map((o, i) => (
                    <i key={i} className={FORM[o].c}>
                      {FORM[o].t}
                    </i>
                  ))}
                </span>
                {streakText && (
                  <span className="small ml-auto flex items-center gap-1 text-xs">
                    <Flame className="size-3.5" /> {streakText}
                  </span>
                )}
              </div>
              {points.length >= 2 && <Evolution points={points} />}
            </>
          )}
        </div>
      </div>

      {profile.played > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <RelationBox
              title="Mejores compañeros"
              hint="Con quién más gana"
              rows={profile.bestPartners}
              byId={byId}
            />
            <RelationBox
              title="Peores compañeros"
              hint="Con quién menos gana"
              rows={profile.worstPartners}
              byId={byId}
            />
            <RelationBox
              title="Sus víctimas"
              hint="Contra quién más gana"
              rows={profile.victims}
              byId={byId}
            />
            <RelationBox
              title="Sus bestias negras"
              hint="Contra quién más pierde"
              rows={profile.nemeses}
              byId={byId}
            />
          </div>
          <p className="small -mt-2 text-xs">Se cuentan relaciones de al menos 2 partidos jugados.</p>

          <section className="glass flex flex-col gap-2.5 p-4">
            <h2 className="h-display h-m">Sus clubes</h2>
            <div className="flex flex-wrap gap-2.5">
              {profile.clubs.map((c) => (
                <span
                  key={c.club}
                  className={cx('pill h-auto gap-2 py-1.5 pr-3 pl-1.5', c.club === lucky && 'pill--on')}
                >
                  <Crest club={c.club} size={26} style={{ borderRadius: 8 }} />
                  <span className="text-[13px]">{getClub(c.club).short}</span>
                  <span className="text-[var(--muted)]">
                    {c.won}/{c.played}
                  </span>
                  {c.club === lucky && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--warn)]">
                      <Sparkles className="size-3.5" /> Talismán
                    </span>
                  )}
                </span>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="h-display h-m">Últimos partidos</h2>
            {profile.recent.map((g) => {
              const mine = getClub(g.club)
              const rival = getClub(g.rivalClub)
              return (
                <div key={g.match.id} className="match cursor-default">
                  <div className={cx('side', g.outcome === 'L' && 'lose')}>
                    <Crest club={mine.id} size={32} />
                    <span>{mine.name}</span>
                  </div>
                  <div className="score">
                    <b className="num">
                      {g.goalsFor} – {g.goalsAgainst}
                    </b>
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="form">
                        <i className={FORM[g.outcome].c}>{FORM[g.outcome].t}</i>
                      </span>
                      <span className="small">{dayMonth(g.match.date)}</span>
                      {g.mvp && (
                        <Star className="size-3 text-[var(--warn)]" fill="currentColor" aria-label="MVP" />
                      )}
                    </span>
                    {g.match.cup && (
                      <span className="text-[10px] font-semibold text-[var(--muted)]">
                        {g.match.cup.name} · {g.match.cup.label}
                      </span>
                    )}
                  </div>
                  <div className={cx('side flex-row-reverse text-right', g.outcome === 'W' && 'lose')}>
                    <Crest club={rival.id} size={32} />
                    <span>{rival.name}</span>
                  </div>
                </div>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
  accent,
  icon,
  hint,
}: {
  label: string
  value: ReactNode
  tone?: 'ok' | 'gold'
  accent?: boolean
  icon?: ReactNode
  hint?: string
}) {
  return (
    <div className="panel flex flex-col gap-1 px-3.5 py-3">
      <span className="eyebrow text-[10px] leading-tight">{label}</span>
      <span
        className={cx(
          'h-display num flex items-center gap-1.5 text-[34px]',
          accent && 'neon',
          tone === 'ok' && 'text-[var(--ok)]',
          tone === 'gold' && 'text-[var(--warn)]',
        )}
      >
        {icon}
        {value}
        {hint && <span className="text-base text-[var(--muted)]">{hint}</span>}
      </span>
    </div>
  )
}

function RelationBox({
  title,
  hint,
  rows,
  byId,
}: {
  title: string
  hint: string
  rows: Relation[]
  byId: Map<string, Player>
}) {
  return (
    <section className="glass flex flex-col gap-2.5 p-4">
      <div>
        <h2 className="h-display h-s">{title}</h2>
        <p className="small text-xs">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="small text-xs">Aún no hay datos suficientes.</p>
      ) : (
        rows.map((r) => {
          const p = byId.get(r.id)
          return (
            <Link
              key={r.id}
              to={`/jugador/${r.id}`}
              className="flex items-center gap-2.5 text-[var(--ink)] no-underline"
            >
              <PlayerAvatar player={p ?? { name: r.name }} className="size-8 text-sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
              <span className="small text-xs tabular-nums">
                {r.won}V {r.drawn}E {r.lost}D
              </span>
              <span className="num w-11 text-right text-sm font-bold">{Math.round(r.winRate * 100)} %</span>
            </Link>
          )
        })
      )}
    </section>
  )
}

const OUTCOME_COLOR: Record<Outcome, string> = { W: '#3BE3A0', D: '#9AA6C7', L: '#FF8A96' }

/** % de victorias acumulado partido a partido */
function Evolution({ points }: { points: TimelinePoint[] }) {
  const last = points[points.length - 1]!
  const prev = points[Math.max(0, points.length - 6)]!
  const trend = last.winRate - prev.winRate
  const x = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100)
  const y = (r: number) => (1 - r) * 100
  const line = points.map((p, i) => `${x(i)},${y(p.winRate)}`).join(' ')
  return (
    <section className="glass flex flex-col gap-2 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">Evolución · % de victorias</span>
        {Math.abs(trend) >= 0.05 && (
          <span className={cx('text-xs font-bold', trend > 0 ? 'text-[var(--ok)]' : 'text-[#FF8A96]')}>
            {trend > 0 ? 'A mejor' : 'A peor'} en los últimos partidos
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="small flex flex-col justify-between py-0.5 text-[10px] tabular-nums" aria-hidden>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div
          className="relative h-[110px] flex-1"
          role="img"
          aria-label={`Porcentaje de victorias: empezó en ${Math.round(points[0]!.winRate * 100)} % y va por ${Math.round(last.winRate * 100)} %`}
        >
          <svg
            className="absolute inset-0 size-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="evo-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--club)" stopOpacity=".35" />
                <stop offset="1" stopColor="var(--club)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              x2="100"
              y1="50"
              y2="50"
              stroke="var(--line-2)"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <polygon points={`0,100 ${line} 100,100`} fill="url(#evo-fill)" />
            <polyline
              points={line}
              fill="none"
              stroke="var(--club)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map((p, i) => (
            <span
              key={i}
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--night-900)]"
              style={{ left: `${x(i)}%`, top: `${y(p.winRate)}%`, background: OUTCOME_COLOR[p.outcome] }}
              title={`${dayMonth(p.date)} · ${FORM[p.outcome].t} · ${Math.round(p.winRate * 100)} %`}
            />
          ))}
        </div>
      </div>
      <div className="small flex justify-between pl-7 text-[10px]">
        <span>{dayMonth(points[0]!.date)}</span>
        <span>
          {points.length} partidos · ahora {Math.round(last.winRate * 100)} %
        </span>
        <span>{dayMonth(last.date)}</span>
      </div>
    </section>
  )
}
