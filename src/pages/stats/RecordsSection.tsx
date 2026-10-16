import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { goalRecords, goalSummary } from '@/domain/goals'
import { headToHead, records } from '@/domain/insights'
import type { Match, Player } from '@/domain/types'
import { useShowMatches, type StatsData } from '@/hooks/useStatsData'
import { cx } from '@/lib/cx'
import { SubSeg } from './bits'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
const names = (list: string[]) =>
  list.length > 1 ? `${list.slice(0, -1).join(', ')} y ${list.at(-1)}` : (list[0] ?? '')

interface Rec {
  key: string
  title: string
  value: ReactNode
  who?: ReactNode
  meta?: ReactNode
  tone?: 'bad' | 'goal'
  onOpen?: () => void
  /** Sin candidatos: texto y cómo bajar el mínimo */
  none?: { text: string; action?: { label: string; run: () => void } }
}

function RecRow({ r }: { r: Rec }) {
  const body = (
    <>
      <span className="k">{r.title}</span>
      <span className="w">{r.none ? r.none.text : r.who}</span>
      {!r.none && r.meta && <span className="m">{r.meta}</span>}
      {r.none?.action && (
        <button className="btn btn--glass btn--sm mt-1 self-start" type="button" onClick={r.none.action.run}>
          {r.none.action.label}
        </button>
      )}
      <span className="v">{r.none ? '—' : r.value}</span>
    </>
  )
  const cls = cx('rr', r.none ? 'rr--none' : r.tone && `rr--${r.tone}`)
  return r.onOpen && !r.none ? (
    <button className={cx(cls, 'rowbtn')} type="button" onClick={r.onOpen}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function RecCard({ r }: { r: Rec }) {
  const body = (
    <>
      <span className="rec__k">{r.title}</span>
      <span className="rec__v" style={r.none ? { color: 'var(--dim)' } : undefined}>
        {r.none ? '—' : r.value}
      </span>
      {r.none ? (
        <>
          <span className="rec__m">{r.none.text}</span>
          {r.none.action && (
            <button className="btn btn--glass btn--sm self-start" type="button" onClick={r.none.action.run}>
              {r.none.action.label}
            </button>
          )}
        </>
      ) : (
        <>
          {r.who && <span className="rec__who">{r.who}</span>}
          {r.meta && <span className="rec__m">{r.meta}</span>}
        </>
      )}
    </>
  )
  const cls = cx('rec', r.tone && `rec--${r.tone}`)
  return r.onOpen && !r.none ? (
    <button className={cls} type="button" onClick={r.onOpen} style={{ cursor: 'pointer' }}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function MinSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-2)]">
      {label}
      <select
        className="cursor-pointer border-0 border-b border-dashed border-[var(--line-2)] bg-transparent text-xs font-semibold text-[var(--ink)]"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Mínimo de partidos para ${label}`}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}

export function RecordsSection({
  data,
  players,
  desktop,
}: {
  data: StatsData
  players: Player[]
  desktop: boolean
}) {
  const { filtered, filter, setFilter, nameMap } = data
  const [tab, setTab] = useState<'part' | 'jug' | 'goles'>('part')
  const navigate = useNavigate()
  const show = useShowMatches()
  const rec = useMemo(() => records(filtered, players, filter.mins), [filtered, players, filter.mins])
  const goals = useMemo(
    () => goalRecords(filtered, nameMap, filter.mins.duo),
    [filtered, nameMap, filter.mins.duo],
  )
  const withGoals = useMemo(() => goalSummary(filtered).matches, [filtered])
  const setMin = (k: 'winRate' | 'duo', v: number) =>
    setFilter({ ...filter, mins: { ...filter.mins, [k]: v } })

  // Hasta dónde hay que bajar el mínimo para que alguien entre
  const maxGames = useMemo(() => {
    const g = new Map<string, number>()
    for (const m of filtered) for (const p of [...m.teamA, ...m.teamB]) g.set(p.id, (g.get(p.id) ?? 0) + 1)
    return Math.max(0, ...g.values())
  }, [filtered])
  const maxDuo = useMemo(() => {
    const g = new Map<string, number>()
    for (const m of filtered)
      for (const t of [m.teamA, m.teamB])
        for (let i = 0; i < t.length; i++)
          for (let j = i + 1; j < t.length; j++) {
            const k = [t[i]!.id, t[j]!.id].sort().join()
            g.set(k, (g.get(k) ?? 0) + 1)
          }
    return Math.max(0, ...g.values())
  }, [filtered])

  const openMatch = (m: Match) => navigate(`/historial/${m.id}`)
  const openPlayer = (ids: string[]) => () => navigate(`/jugador/${ids[0]}`)
  const duoMatches = (ids: [string, string], title: string) => () =>
    show(
      headToHead(filtered, ids[0], ids[1])
        .games.filter((g) => g.together)
        .map((g) => g.match),
      title,
    )
  const clubs = (m: Match) => (
    <>
      <Crest club={m.clubA} size={22} />
      {getClub(m.clubA).short} · {getClub(m.clubB).short}
      <Crest club={m.clubB} size={22} />
    </>
  )

  const matchRecs: Rec[] = [
    rec.biggestWin
      ? {
          key: 'goleada',
          title: 'Mayor goleada',
          value: `${rec.biggestWin.match.scoreA}–${rec.biggestWin.match.scoreB}`,
          who: clubs(rec.biggestWin.match),
          meta: `+${rec.biggestWin.value} · ${dayMonth(rec.biggestWin.match.date)}`,
          onOpen: () => openMatch(rec.biggestWin!.match),
        }
      : { key: 'goleada', title: 'Mayor goleada', value: '', none: { text: 'Aún no hay ninguna victoria.' } },
    rec.mostGoals
      ? {
          key: 'goles',
          title: 'Más goles en un partido',
          value: `${rec.mostGoals.match.scoreA}–${rec.mostGoals.match.scoreB}`,
          who: clubs(rec.mostGoals.match),
          meta: `${rec.mostGoals.value} goles · ${dayMonth(rec.mostGoals.match.date)}`,
          onOpen: () => openMatch(rec.mostGoals!.match),
        }
      : { key: 'goles', title: 'Más goles en un partido', value: '', none: { text: 'Aún no hay goles.' } },
  ]

  const lowerMin = (k: 'winRate' | 'duo', max: number) =>
    max > 0 ? { label: `Bajar el mínimo a ${max}`, run: () => setMin(k, max) } : undefined
  const playerRecs: Rec[] = [
    rec.bestStreak
      ? {
          key: 'racha',
          title: 'Mejor racha',
          value: `${rec.bestStreak.value}V`,
          who: names(rec.bestStreak.names),
          meta: 'victorias seguidas',
          onOpen: openPlayer(rec.bestStreak.ids),
        }
      : { key: 'racha', title: 'Mejor racha', value: '', none: { text: 'Nadie ha ganado dos seguidos.' } },
    rec.mostMvps
      ? {
          key: 'mvp',
          title: 'Rey del MVP',
          value: (
            <>
              {rec.mostMvps.value}
              <span className="star" aria-hidden style={{ width: 22, height: 22 }} />
            </>
          ),
          who: names(rec.mostMvps.names),
          meta: rec.mostMvps.value === 1 ? 'vez elegido' : 'veces elegido',
          onOpen: openPlayer(rec.mostMvps.ids),
        }
      : { key: 'mvp', title: 'Rey del MVP', value: '', none: { text: 'Aún no hay ningún MVP.' } },
    rec.bestWinRate
      ? {
          key: 'pct',
          title: 'Mejor % de victorias',
          value: `${rec.bestWinRate.value} %`,
          who: names(rec.bestWinRate.names),
          meta: rec.bestWinRate.detail
            ? `${rec.bestWinRate.detail} · mín. ${filter.mins.winRate}`
            : `mín. ${filter.mins.winRate}`,
          onOpen: openPlayer(rec.bestWinRate.ids),
        }
      : {
          key: 'pct',
          title: 'Mejor % de victorias',
          value: '',
          none: {
            text: `Nadie ha jugado ${filter.mins.winRate} partidos.`,
            action: maxGames < filter.mins.winRate ? lowerMin('winRate', maxGames) : undefined,
          },
        },
    rec.mostPlayed
      ? {
          key: 'fijo',
          title: 'El fijo',
          value: rec.mostPlayed.value,
          who: names(rec.mostPlayed.names),
          meta: 'partidos jugados',
          onOpen: openPlayer(rec.mostPlayed.ids),
        }
      : { key: 'fijo', title: 'El fijo', value: '', none: { text: 'Aún no hay partidos.' } },
    rec.bestDuo
      ? {
          key: 'duo',
          title: 'Pareja invencible',
          value: `${Math.round(rec.bestDuo.winRate * 100)} %`,
          who: `${rec.bestDuo.names[0]} y ${rec.bestDuo.names[1]}`,
          meta: `${rec.bestDuo.won} de ${rec.bestDuo.played} juntos · mín. ${filter.mins.duo}`,
          onOpen: duoMatches(rec.bestDuo.ids, `${rec.bestDuo.names[0]} y ${rec.bestDuo.names[1]} juntos`),
        }
      : {
          key: 'duo',
          title: 'Pareja invencible',
          value: '',
          none: {
            text: `Ninguna pareja ha jugado junta ${filter.mins.duo} veces.`,
            action: maxDuo < filter.mins.duo ? lowerMin('duo', maxDuo) : undefined,
          },
        },
    ...(rec.worstDuo
      ? [
          {
            key: 'gafe',
            title: 'Pareja gafe',
            value: `${Math.round(rec.worstDuo.winRate * 100)} %`,
            who: `${rec.worstDuo.names[0]} y ${rec.worstDuo.names[1]}`,
            meta: `${rec.worstDuo.won} de ${rec.worstDuo.played} juntos`,
            tone: 'bad' as const,
            onOpen: duoMatches(
              rec.worstDuo.ids,
              `${rec.worstDuo.names[0]} y ${rec.worstDuo.names[1]} juntos`,
            ),
          },
        ]
      : []),
  ]

  const goalRecs: Rec[] = [
    goals.mostInMatch && {
      key: 'gpartido',
      title: 'Más en un partido',
      value: goals.mostInMatch.value,
      who: names(goals.mostInMatch.names),
      meta: goals.mostInMatch.match
        ? `${dayMonth(goals.mostInMatch.match.date)} · ${getClub(goals.mostInMatch.match.clubA).short} ${goals.mostInMatch.match.scoreA}–${goals.mostInMatch.match.scoreB} ${getClub(goals.mostInMatch.match.clubB).short}`
        : 'empatados',
      tone: 'goal' as const,
      onOpen: goals.mostInMatch.match
        ? () => openMatch(goals.mostInMatch!.match!)
        : openPlayer(goals.mostInMatch.ids),
    },
    goals.mostHatTricks && {
      key: 'ht',
      title: 'Más hat-tricks',
      value: goals.mostHatTricks.value,
      who: names(goals.mostHatTricks.names),
      meta: goals.mostHatTricks.names.length > 1 ? 'empatados: salen todos' : '3 goles o más en un partido',
      tone: 'goal' as const,
      onOpen: openPlayer(goals.mostHatTricks.ids),
    },
    goals.scoringStreak && {
      key: 'gracha',
      title: 'Racha marcando',
      value: goals.scoringStreak.value,
      who: names(goals.scoringStreak.names),
      meta: 'partidos seguidos con gol',
      tone: 'goal' as const,
      onOpen: openPlayer(goals.scoringStreak.ids),
    },
    goals.bestDuo && {
      key: 'gduo',
      title: 'Pareja goleadora',
      value: goals.bestDuo.goals,
      who: `${goals.bestDuo.names[0]} y ${goals.bestDuo.names[1]}`,
      meta: `goles sumados en ${goals.bestDuo.played} partidos juntos`,
      tone: 'goal' as const,
      onOpen: duoMatches(goals.bestDuo.ids, `${goals.bestDuo.names[0]} y ${goals.bestDuo.names[1]} juntos`),
    },
  ].filter((r): r is NonNullable<typeof r> => !!r)

  const mins = (
    <div className="flex flex-wrap items-center gap-4 py-1 text-xs font-medium text-[var(--muted)]">
      <span>Mínimo de partidos:</span>
      <MinSelect label="% victorias" value={filter.mins.winRate} onChange={(v) => setMin('winRate', v)} />
      <MinSelect label="Parejas" value={filter.mins.duo} onChange={(v) => setMin('duo', v)} />
    </div>
  )
  const goalsNote = (
    <p className="note flex items-center gap-1.5 pt-1">
      <span className="ball" aria-hidden style={{ color: '#9FF3CF' }} />
      {withGoals
        ? `Sobre ${withGoals} ${withGoals === 1 ? 'partido' : 'partidos'} con goleadores`
        : 'Aún no hay partidos con goleadores apuntados.'}
    </p>
  )
  const foot = (
    <p className="note pt-1.5">Empates en un récord: salen todos. Toca uno para ver sus partidos.</p>
  )

  if (desktop)
    return (
      <div className="flex flex-col gap-6">
        {mins}
        <section className="flex flex-col gap-3">
          <h2 className="h-display h-m">Resultados y rachas</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
            {[...matchRecs, ...playerRecs].map((r) => (
              <RecCard key={r.key} r={r} />
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <div className="card__h">
            <h2 className="h-display h-m">Goles</h2>
            {goalsNote}
          </div>
          {goalRecs.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
              {goalRecs.map((r) => (
                <RecCard key={r.key} r={r} />
              ))}
            </div>
          )}
        </section>
        {foot}
      </div>
    )

  return (
    <div className="flex flex-col gap-1">
      <SubSeg
        label="Apartados"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'part', label: 'Partidos' },
          { value: 'jug', label: 'Jugadores' },
          { value: 'goles', label: 'Goles' },
        ]}
      />
      {tab === 'part' && matchRecs.map((r) => <RecRow key={r.key} r={r} />)}
      {tab === 'jug' && (
        <>
          {mins}
          {playerRecs.map((r) => (
            <RecRow key={r.key} r={r} />
          ))}
        </>
      )}
      {tab === 'goles' && (
        <>
          {goalsNote}
          {goalRecs.map((r) => (
            <RecRow key={r.key} r={r} />
          ))}
        </>
      )}
      {foot}
    </div>
  )
}
