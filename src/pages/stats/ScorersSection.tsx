import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { goalSummary, goalsPerMatch, hasScorers, scorerTable, topScorerByClub } from '@/domain/goals'
import { isPlayed } from '@/domain/standings'
import type { Match, Player } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { useShowMatches, type StatsData } from '@/hooks/useStatsData'
import { useSort } from '@/hooks/useSort'
import { cx } from '@/lib/cx'
import { BlockHead, SearchBox, SortTh, SubSeg } from './bits'

type Key = 'goles' | 'conGol' | 'gp' | 'mejor' | 'ht'

const dec = (v: number) => v.toFixed(2).replace('.', ',')
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const month = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1]

/** Sin goleadores apuntados con este filtro */
function NoGoals({ count, last }: { count: number; last: Match | null }) {
  const { isAdmin } = useAuth()
  return (
    <div className="empty">
      <span className="empty__ic empty__ic--goal">
        <span className="ball" aria-hidden style={{ width: 32, height: 32, color: '#9FF3CF' }} />
      </span>
      <h3 className="h-display h-l">Aún no hay goles apuntados</h3>
      <p className="body-text max-w-sm">
        {count === 1 ? 'Este partido no tiene' : `Ninguno de estos ${count} partidos tiene`} goleadores. El
        Pichichi empieza a contar cuando se apunta el primero.
      </p>
      {isAdmin && last && (
        <Link className="btn btn--primary w-full max-w-sm" to={`/historial/${last.id}/goles`}>
          Apuntar los del último partido
        </Link>
      )}
    </div>
  )
}

export function ScorersSection({
  data,
  players,
  desktop,
}: {
  data: StatsData
  players: Player[]
  desktop: boolean
}) {
  const { filtered, nameMap } = data
  const [tab, setTab] = useState<'pich' | 'club'>('pich')
  const [q, setQ] = useState('')
  const sort = useSort<Key>('goles')
  const show = useShowMatches()
  const avatars = useMemo(() => new Map(players.map((p) => [p.id, p.avatar])), [players])
  const { summary, table, clubs, bars } = useMemo(
    () => ({
      summary: goalSummary(filtered),
      table: scorerTable(filtered, nameMap).filter((r) => r.goals > 0),
      clubs: topScorerByClub(filtered, nameMap),
      bars: goalsPerMatch(filtered).slice(-12),
    }),
    [filtered, nameMap],
  )

  if (summary.matches === 0) {
    const last =
      [...filtered]
        .filter(isPlayed)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)[0] ?? null
    return <NoGoals count={filtered.length} last={last && !last.id.includes(':') ? last : null} />
  }

  type Row = (typeof table)[number]
  const value: Record<Key, (r: Row) => number> = {
    // Por defecto, el orden del Pichichi (el mismo que el podio)
    goles: (r) => -table.indexOf(r),
    conGol: (r) => r.withGoal,
    gp: (r) => r.perMatch,
    mejor: (r) => r.best?.goals ?? 0,
    ht: (r) => r.hatTricks,
  }
  const query = q.trim().toLowerCase()
  const list = [...table]
    .sort(
      (a, b) => sort.dir * (value[sort.key](a) - value[sort.key](b)) || a.name.localeCompare(b.name, 'es'),
    )
    .filter((r) => !query || r.name.toLowerCase().includes(query))
  const goalsOf = (r: Row) =>
    show(
      filtered.filter((m) => hasScorers(m) && (m.goals.byPlayer[r.id] ?? 0) > 0),
      `Partidos con gol de ${r.name}`,
    )
  const th = (k: Key, label: string) => (
    <SortTh label={label} sort={sort.aria(k)} onSort={() => sort.pick(k)} />
  )
  const on = (k: Key) => (sort.key === k ? 'on' : undefined)
  const note = (
    <p className="note">
      Solo cuentan los {summary.matches} {summary.matches === 1 ? 'partido' : 'partidos'} con goleadores
      apuntados.
      {summary.own > 0 &&
        ` ${summary.own === 1 ? 'El gol' : `Los ${summary.own} goles`} en propia puerta no ${summary.own === 1 ? 'es' : 'son'} de nadie.`}
    </p>
  )

  const podium = (
    <div className="podium">
      {[table[1], table[0], table[2]].map((r, i) =>
        r ? (
          <Link key={r.id} className={cx('pd', i === 1 && 'pd--1')} to={`/jugador/${r.id}`}>
            <span className="note" style={i === 1 ? { color: '#C9BBFF' } : undefined}>
              {i === 1 ? '1.º' : i === 0 ? '2.º' : '3.º'}
            </span>
            {desktop && (
              <PlayerAvatar
                player={{ name: r.name, avatar: avatars.get(r.id) ?? null }}
                className={i === 1 ? 'size-20 text-2xl' : 'size-16 text-xl'}
              />
            )}
            <span className="g">{r.goals}</span>
            <span className="n">{r.name}</span>
            {desktop && (
              <span className="note">
                {r.withGoal} {r.withGoal === 1 ? 'partido' : 'partidos'} con gol
                {r.hatTricks > 0 && ` · ${r.hatTricks} hat-trick${r.hatTricks > 1 ? 's' : ''}`}
              </span>
            )}
          </Link>
        ) : (
          <span key={i} />
        ),
      )}
    </div>
  )

  const tableEl = (
    <table className="st">
      <thead>
        <tr>
          <SortTh left label="Jugador" sort="none" onSort={() => undefined} />
          {th('goles', 'Goles')}
          {th('conGol', 'Con gol')}
          {th('gp', 'G/P')}
          {desktop && th('mejor', 'Mejor')}
          {desktop && th('ht', 'Hat-tricks')}
        </tr>
      </thead>
      <tbody>
        {list.map((r, i) => (
          <tr key={r.id} className={cx(i === 0 && !query && sort.key === 'goles' && 'lead')}>
            <td>
              <Link to={`/jugador/${r.id}`} className="no-underline">
                <span className="who2">
                  <span className="pos2">{i + 1}</span>
                  <PlayerAvatar player={{ name: r.name, avatar: avatars.get(r.id) ?? null }} />
                  <span>{r.name}</span>
                </span>
              </Link>
            </td>
            <td className={on('goles')}>
              <button className="lnk" type="button" onClick={() => goalsOf(r)}>
                {r.goals}
              </button>
            </td>
            <td className={on('conGol')}>
              {r.withGoal}
              <span className="text-[var(--dim)]">/{r.played}</span>
            </td>
            <td className={on('gp')}>{dec(r.perMatch)}</td>
            {desktop && <td className={on('mejor')}>{r.best?.goals ?? ''}</td>}
            {desktop && <td className={on('ht')}>{r.hatTricks || ''}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )

  const clubList = clubs.map((c) => (
    <div key={c.club} className="cg">
      <Crest club={c.club} size={34} />
      <span className="t">
        <b>{c.names.join(' y ')}</b>
        <span>{getClub(c.club).name}</span>
      </span>
      <span className="v">{c.goals}</span>
    </div>
  ))

  const max = Math.max(1, ...bars.map((b) => b.goals))
  const avg = bars.length ? bars.reduce((a, b) => a + b.goals, 0) / bars.length : 0

  if (desktop)
    return (
      <div className="flex flex-col gap-6">
        <span className="pillnote self-start">
          <span className="ball" aria-hidden style={{ color: '#9FF3CF' }} />
          Sobre {summary.matches} partidos con goleadores · {summary.goals} goles
        </span>
        <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex flex-col gap-6">
            <section aria-label="Pichichi" className="flex flex-col gap-3">
              <h2 className="h-display h-m">Pichichi</h2>
              {podium}
            </section>
            <section className="flex flex-col gap-3">
              <BlockHead
                small
                title="Goles por partido"
                note={`Media ${avg.toFixed(1).replace('.', ',')} · sigue al filtro`}
              />
              <div
                className="bars"
                role="img"
                aria-label={`Goles en los últimos ${bars.length} partidos con goleadores`}
              >
                {bars.map((b) => (
                  <Link key={b.match.id} to={`/historial/${b.match.id}`} title={b.match.date}>
                    <b>{b.goals}</b>
                    <i style={{ height: `${(b.goals / max) * 100}%` }} />
                    <small>{month(b.match.date)}</small>
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <section className="flex flex-col gap-2.5">
            <div className="card__h">
              <h2 className="h-display h-m">Tabla de goleadores</h2>
              <SearchBox id="gq" value={q} onChange={setQ} className="w-[220px]" />
            </div>
            <div className="tblbox">{tableEl}</div>
            {note}
          </section>
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="h-display h-s">Máximo goleador por club</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-5">
            {clubList}
          </div>
        </section>
      </div>
    )

  return (
    <div className="flex flex-col gap-2.5">
      <span className="fcount">
        <strong>{summary.matches}</strong> partidos con goleadores · {summary.goals} goles
      </span>
      <SubSeg
        label="Apartados"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pich', label: 'Pichichi' },
          { value: 'club', label: 'Por club' },
        ]}
      />
      {tab === 'pich' ? (
        <>
          {podium}
          {tableEl}
          {note}
        </>
      ) : (
        <>
          {clubList}
          <p className="note">El que más goles ha marcado jugando con cada club.</p>
        </>
      )}
    </div>
  )
}
