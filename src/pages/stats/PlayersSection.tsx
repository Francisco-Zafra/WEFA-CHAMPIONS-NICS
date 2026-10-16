import { Filter } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { goalSummary, scorerTable } from '@/domain/goals'
import { currentStreaks, gamesOf, streakLabel } from '@/domain/profile'
import { playerStandings } from '@/domain/standings'
import type { Player } from '@/domain/types'
import { useShowMatches, type StatsData } from '@/hooks/useStatsData'
import { useSort } from '@/hooks/useSort'
import { cx } from '@/lib/cx'
import { BlockHead, FormDots, SearchBox, SortTh } from './bits'

type Key = 'pj' | 'v' | 'e' | 'd' | 'pct' | 'mvp' | 'goles' | 'gp' | 'racha' | 'forma'

const dec = (v: number) => v.toFixed(2).replace('.', ',')
const streakColor = (k?: string) => (k === 'W' ? '#3BE3A0' : k === 'L' ? '#FF8A96' : '#9AA6C7')

export function PlayersSection({
  data,
  players,
  desktop,
}: {
  data: StatsData
  players: Player[]
  desktop: boolean
}) {
  const { filtered, nameMap } = data
  const sort = useSort<Key>('v')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const [full, setFull] = useState(true)
  const show = useShowMatches()
  const avatars = useMemo(() => new Map(players.map((p) => [p.id, p.avatar])), [players])

  const { rows, hasGoals } = useMemo(() => {
    const goals = new Map(scorerTable(filtered, nameMap).map((r) => [r.id, r]))
    const streaks = currentStreaks(filtered)
    const rows = playerStandings(filtered, nameMap).map((r) => {
      const s = streaks.get(r.id) ?? null
      const g = goals.get(r.id)
      return {
        ...r,
        goals: g?.goals ?? 0,
        perMatch: g?.perMatch ?? 0,
        streak: s,
        streakN: s ? (s.kind === 'W' ? 1 : s.kind === 'D' ? 0 : -1) * s.count : 0,
        formPts: r.form.reduce((a, o) => a + (o === 'W' ? 3 : o === 'D' ? 1 : 0), 0),
      }
    })
    return { rows, hasGoals: goalSummary(filtered).matches > 0 }
  }, [filtered, nameMap])

  type Row = (typeof rows)[number]
  const value: Record<Key, (r: Row) => number> = {
    pj: (r) => r.played,
    v: (r) => r.won * 1000 + r.winRate * 100 + r.mvps / 100,
    e: (r) => r.drawn,
    d: (r) => r.lost,
    pct: (r) => r.winRate,
    mvp: (r) => r.mvps,
    goles: (r) => r.goals,
    gp: (r) => r.perMatch,
    racha: (r) => r.streakN,
    forma: (r) => r.formPts,
  }
  const query = q.trim().toLowerCase()
  const list = [...rows]
    .sort(
      (a, b) => sort.dir * (value[sort.key](a) - value[sort.key](b)) || a.name.localeCompare(b.name, 'es'),
    )
    .filter((r) => !query || r.name.toLowerCase().includes(query))

  const wins = (id: string, name: string) =>
    show(
      gamesOf(filtered, id)
        .filter((g) => g.outcome === 'W')
        .map((g) => g.match),
      `Victorias de ${name}`,
    )
  const filterBy = (id: string) => data.setFilter({ ...data.filter, players: [id] })
  const who = (r: Row, i: number) => (
    <span className="who2">
      <span className="pos2">{i + 1}</span>
      <PlayerAvatar player={{ name: r.name, avatar: avatars.get(r.id) ?? null }} />
      <span>{r.name}</span>
    </span>
  )
  const th = (k: Key, label: string) => (
    <SortTh key={k} label={label} sort={sort.aria(k)} onSort={() => sort.pick(k)} />
  )
  const on = (k: Key) => (sort.key === k ? 'on' : undefined)

  if (desktop) {
    const cols: [Key, string][] = full
      ? [
          ['pj', 'PJ'],
          ['v', 'V'],
          ['e', 'E'],
          ['d', 'D'],
          ['pct', '%'],
          ['mvp', 'MVP'],
          ...(hasGoals
            ? ([
                ['goles', 'Goles'],
                ['gp', 'G/P'],
              ] as [Key, string][])
            : []),
          ['racha', 'Racha'],
          ['forma', 'Forma'],
        ]
      : [
          ['v', 'V/PJ'],
          ['pct', '%'],
          ['mvp', 'MVP'],
          ['racha', 'Racha'],
        ]
    const cell = (r: Row, k: Key) => {
      if (k === 'v')
        return (
          <button className="lnk" type="button" onClick={() => wins(r.id, r.name)}>
            {r.won}
            {!full && <span className="text-[var(--dim)]">/{r.played}</span>}
          </button>
        )
      if (k === 'pct') return `${Math.round(r.winRate * 100)} %`
      if (k === 'pj') return r.played
      if (k === 'e') return r.drawn
      if (k === 'd') return r.lost
      if (k === 'mvp') return r.mvps || ''
      if (k === 'goles') return r.goals || ''
      if (k === 'gp') return r.goals ? dec(r.perMatch) : ''
      if (k === 'racha')
        return (
          <span style={{ color: streakColor(r.streak?.kind), fontWeight: 700 }}>{streakLabel(r.streak)}</span>
        )
      return <FormDots form={r.form} className="justify-end" />
    }
    return (
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="h-display h-m">Ranking por victorias</h2>
          <div className="flex items-center gap-4">
            <SearchBox id="dq" value={q} onChange={setQ} className="w-[240px]" />
            <div className="seg" role="group" aria-label="Vista">
              <button type="button" aria-pressed={!full} onClick={() => setFull(false)}>
                Corta
              </button>
              <button type="button" aria-pressed={full} onClick={() => setFull(true)}>
                Completa
              </button>
            </div>
          </div>
        </div>
        <div className="tblbox">
          <table className="st">
            <thead>
              <tr>
                <SortTh left label="Jugador" sort="none" onSort={() => undefined} />
                {cols.map(([k, l]) => th(k, l))}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.id} className={cx(i === 0 && !query && sort.key === 'v' && 'lead')}>
                  <td>
                    <Link to={`/jugador/${r.id}`} className="no-underline">
                      {who(r, i)}
                    </Link>
                  </td>
                  {cols.map(([k]) => (
                    <td key={k} className={on(k)}>
                      {cell(r, k)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Toca una cabecera para ordenar (otra vez para invertir) y un jugador para abrir su ficha. Empates en
          victorias: decide el % y después los MVP.
          {hasGoals && ' Goles: solo los partidos con goleadores apuntados.'}
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2.5">
      <BlockHead
        title="Ranking"
        note={
          <button className="btn btn--ghost btn--sm h-9 px-2" type="button" onClick={() => setAll((x) => !x)}>
            {all ? 'Vista corta' : 'Ver todo'}
          </button>
        }
      />
      <SearchBox id="jq" value={q} onChange={setQ} />
      <table className="st">
        <thead>
          <tr>
            <SortTh left label="Jugador" sort="none" onSort={() => undefined} />
            {th('v', 'V/PJ')}
            {th('pct', '%')}
            {th('mvp', 'MVP')}
            {th('racha', 'Racha')}
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => {
            const expanded = all || open === r.id
            return (
              <Fragment key={r.id}>
                <tr className={cx(i === 0 && !query && sort.key === 'v' && 'lead')}>
                  <td style={{ maxWidth: 150 }}>
                    <button
                      className="rowbtn"
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(open === r.id ? null : r.id)}
                    >
                      {who(r, i)}
                    </button>
                  </td>
                  <td className={on('v')}>
                    <button className="lnk" type="button" onClick={() => wins(r.id, r.name)}>
                      {r.won}
                    </button>
                    <span className="text-[var(--dim)]">/{r.played}</span>
                  </td>
                  <td className={on('pct')}>{Math.round(r.winRate * 100)} %</td>
                  <td className={on('mvp')}>{r.mvps || ''}</td>
                  <td className={on('racha')} style={{ color: streakColor(r.streak?.kind), fontWeight: 700 }}>
                    {streakLabel(r.streak)}
                  </td>
                </tr>
                {expanded && (
                  <tr className="det">
                    <td colSpan={5}>
                      <div className="grid grid-cols-3 gap-x-2.5 gap-y-2 pt-1 pb-1.5 text-left">
                        <div>
                          <span className="eyebrow block text-[10px]">Empates · derrotas</span>
                          <b className="text-sm">
                            {r.drawn} · {r.lost}
                          </b>
                        </div>
                        <div>
                          <span className="eyebrow block text-[10px]">Goles</span>
                          <b className="text-sm">{hasGoals ? r.goals : '–'}</b>
                        </div>
                        <div>
                          <span className="eyebrow block text-[10px]">Forma</span>
                          <FormDots form={r.form} className="mt-1" />
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Link className="btn btn--glass btn--sm flex-1" to={`/jugador/${r.id}`}>
                          Ver ficha
                        </Link>
                        <button
                          className="btn btn--glass btn--sm flex-1"
                          type="button"
                          onClick={() => filterBy(r.id)}
                        >
                          <Filter /> Filtrar por {r.name.split(' ')[0]}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="note">
        Toca una columna para ordenar y un jugador para ver más. Empates en victorias: decide el % y después
        los MVP.
      </p>
    </section>
  )
}
