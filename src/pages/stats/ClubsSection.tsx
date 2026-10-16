import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { champion, cupStatus, nextPending, roundOf, runnerUp, titles, type Cup } from '@/domain/cup'
import { rivalries } from '@/domain/profile'
import { clubStandings, pointsByMonth, type ClubRow } from '@/domain/standings'
import type { ClubId } from '@/domain/types'
import { useShowMatches, type StatsData } from '@/hooks/useStatsData'
import { useSort } from '@/hooks/useSort'
import { cx } from '@/lib/cx'
import { BlockHead, FormDots, SortTh, SubSeg } from './bits'

type Key = 'pj' | 'g' | 'e' | 'p' | 'gf' | 'gc' | 'dg' | 'pts'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const monthName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1]
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${monthName(iso)}`
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

/** Puntos acumulados mes a mes de los cuatro primeros */
function PointsChart({ data }: { data: ReturnType<typeof pointsByMonth> }) {
  const series = data.series.slice(0, 4)
  const n = data.months.length
  const max = Math.max(1, ...series.map((s) => s.points.at(-1) ?? 0))
  const x = (i: number) => 30 + (n > 1 ? (i * 478) / (n - 1) : 239)
  const y = (p: number) => 200 - (p / max) * 170
  const ticks = [0, Math.round(max / 2), max]
  // Etiquetas finales sin pisarse
  const ends = series.map((s) => ({ club: s.club, v: s.points.at(-1) ?? 0, y: y(s.points.at(-1) ?? 0) + 4 }))
  for (let i = 1; i < ends.length; i++) if (ends[i]!.y - ends[i - 1]!.y < 12) ends[i]!.y = ends[i - 1]!.y + 12
  return (
    <>
      <svg
        className="chart"
        viewBox="0 0 540 230"
        role="img"
        aria-label={`Puntos acumulados: ${ends.map((e) => `${getClub(e.club).name} ${e.v}`).join(', ')}`}
      >
        <g stroke="rgba(170,190,255,.12)">
          {ticks.map((t) => (
            <line key={t} x1="30" y1={y(t)} x2="508" y2={y(t)} />
          ))}
        </g>
        <g fontFamily="Geist Variable, sans-serif" fontSize="10" fill="#6F7BA0">
          {ticks.map((t) => (
            <text key={t} x="22" y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          ))}
          {n > 0 && (
            <text x="30" y="220">
              {monthName(data.months[0]!)}
            </text>
          )}
          {n > 1 && (
            <text x="508" y="220" textAnchor="end">
              {monthName(data.months[n - 1]!)}
            </text>
          )}
        </g>
        {[...series].reverse().map((s, i) => (
          <polyline
            key={s.club}
            points={s.points.map((p, j) => `${x(j)},${y(p)}`).join(' ')}
            fill="none"
            stroke={getClub(s.club).primary}
            strokeWidth={i === series.length - 1 ? 3.5 : 2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <g fontFamily="Geist Variable, sans-serif" fontSize="11" fontWeight="700">
          {ends.map((e) => (
            <text key={e.club} x="512" y={e.y} fill={getClub(e.club).primary}>
              {e.v}
            </text>
          ))}
        </g>
      </svg>
      <div className="flex flex-wrap gap-3.5 text-xs font-semibold text-[var(--ink-2)]">
        {series.map((s) => (
          <span key={s.club} className="flex items-center gap-1.5">
            <i className="block h-[3px] w-4 rounded" style={{ background: getClub(s.club).primary }} />
            {getClub(s.club).name}
          </span>
        ))}
      </div>
    </>
  )
}

function Palmares({ cups }: { cups: Cup[] }) {
  const won = titles(cups)
  if (cups.length === 0) return <p className="small">Aún no hay copas.</p>
  return (
    <div className="flex flex-col gap-2.5">
      {cups.map((c) => {
        const win = champion(c)
        const second = runnerUp(c)
        if (win)
          return (
            <div key={c.id} className="cupc">
              <Crest club={win} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">
                  {getClub(win).name} · {won.get(win) ?? 1} {(won.get(win) ?? 1) === 1 ? 'título' : 'títulos'}
                </div>
                <div className="note">
                  {c.name}
                  {second && ` · subcampeón: ${getClub(second).name}`}
                </div>
              </div>
            </div>
          )
        const next = nextPending(c)
        return (
          <div key={c.id} className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
            <span className="cuptag">{c.name.toUpperCase()}</span>
            {cupStatus(c) === 'draft'
              ? 'Por empezar'
              : `En juego · ${next !== null ? roundOf(next).name.toLowerCase() : ''}`}
          </div>
        )
      })}
      <Link className="btn btn--glass btn--sm self-start" to="/copa">
        Ver el cuadro en Copa
      </Link>
    </div>
  )
}

export function ClubsSection({ data, cups, desktop }: { data: StatsData; cups: Cup[]; desktop: boolean }) {
  const { filtered } = data
  const [tab, setTab] = useState<'tabla' | 'h2h' | 'palm'>('tabla')
  const sort = useSort<Key>('pts')
  const show = useShowMatches()
  const { table, h2h, points } = useMemo(
    () => ({ table: clubStandings(filtered), h2h: rivalries(filtered), points: pointsByMonth(filtered) }),
    [filtered],
  )
  const totals = table.reduce((t, r) => ({ w: t.w + r.won, d: t.d + r.drawn }), { w: 0, d: 0 })
  const value: Record<Key, (r: ClubRow) => number> = {
    pj: (r) => r.played,
    g: (r) => r.won,
    e: (r) => r.drawn,
    p: (r) => r.lost,
    gf: (r) => r.goalsFor,
    gc: (r) => r.goalsAgainst,
    dg: (r) => r.goalsFor - r.goalsAgainst,
    pts: (r) => r.points * 10000 + (r.goalsFor - r.goalsAgainst) * 100 + r.goalsFor,
  }
  const rows = [...table].sort((a, b) => sort.dir * (value[sort.key](a) - value[sort.key](b)))
  const toggleClub = (club: ClubId) =>
    data.setFilter({
      ...data.filter,
      clubs: data.filter.clubs.includes(club)
        ? data.filter.clubs.filter((c) => c !== club)
        : [...data.filter.clubs, club],
    })
  const clubMatches = (club: ClubId) =>
    show(
      filtered.filter((m) => m.clubA === club || m.clubB === club),
      `Partidos de ${getClub(club).name}`,
    )
  const cols: [Key, string][] = desktop
    ? [
        ['pj', 'PJ'],
        ['g', 'G'],
        ['e', 'E'],
        ['p', 'P'],
        ['gf', 'GF'],
        ['gc', 'GC'],
        ['dg', 'DG'],
        ['pts', 'Pts'],
      ]
    : [
        ['pj', 'PJ'],
        ['g', 'G'],
        ['e', 'E'],
        ['p', 'P'],
        ['dg', 'DG'],
        ['pts', 'Pts'],
      ]
  const cell = (r: ClubRow, k: Key) =>
    k === 'pj' ? (
      <button className="lnk" type="button" onClick={() => clubMatches(r.club)}>
        {r.played}
      </button>
    ) : k === 'dg' ? (
      signed(r.goalsFor - r.goalsAgainst)
    ) : k === 'pts' ? (
      <span className="pts">{r.points}</span>
    ) : (
      { g: r.won, e: r.drawn, p: r.lost, gf: r.goalsFor, gc: r.goalsAgainst }[k]
    )

  const tableEl = (
    <div className="tblbox">
      <table className="st">
        <thead>
          <tr>
            <SortTh left label="Club" sort="none" onSort={() => undefined} />
            {cols.map(([k, l]) => (
              <SortTh key={k} label={l} sort={sort.aria(k)} onSort={() => sort.pick(k)} />
            ))}
            {desktop && <SortTh label="Forma" sort="none" onSort={() => undefined} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.club}
              className={cx(i === 0 && sort.key === 'pts' && r.points > 0 && 'lead')}
              style={r.played === 0 ? { opacity: 0.5 } : undefined}
            >
              <td>
                <button
                  className="rowbtn"
                  type="button"
                  aria-pressed={data.filter.clubs.includes(r.club)}
                  aria-label={`Filtrar por ${getClub(r.club).name}`}
                  onClick={() => toggleClub(r.club)}
                >
                  <span className="who2">
                    <span className="pos2">{i + 1}</span>
                    <Crest club={r.club} size={desktop ? 28 : 24} />
                    <span className="max-w-[110px] lg:max-w-none">
                      {desktop ? getClub(r.club).name : getClub(r.club).short}
                    </span>
                  </span>
                </button>
              </td>
              {cols.map(([k]) => (
                <td key={k} className={sort.key === k ? 'on' : undefined}>
                  {cell(r, k)}
                </td>
              ))}
              {desktop && (
                <td>
                  <FormDots form={r.form} className="justify-end" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
  const tableNote = (
    <p className="note">
      {totals.w} {totals.w === 1 ? 'victoria' : 'victorias'} · {totals.d / 2}{' '}
      {totals.d / 2 === 1 ? 'empate' : 'empates'}. Victoria 3, empate 1; en copa, los penaltis cuentan como
      victoria. Empate a puntos: DG y luego goles a favor. Toca un club para añadirlo al filtro.
    </p>
  )

  const h2hList =
    h2h.length === 0 ? (
      <p className="small">Sin enfrentamientos con este filtro.</p>
    ) : (
      h2h.map((r) => {
        const a = getClub(r.a)
        const b = getClub(r.b)
        const dom = r.winsA === r.winsB ? 'Igualadísimo' : `Domina ${(r.winsA > r.winsB ? a : b).short}`
        return (
          <button
            key={`${r.a}|${r.b}`}
            className="h2h rowbtn"
            type="button"
            onClick={() =>
              show(
                filtered.filter((m) => [m.clubA, m.clubB].sort().join() === [r.a, r.b].sort().join()),
                `${a.short} contra ${b.short}`,
              )
            }
          >
            <div className="h2h__top">
              <div className="h2h__s">
                <Crest club={r.a} size={30} />
                <span>{desktop ? a.name : a.short}</span>
              </div>
              <div className="h2h__s" style={{ gap: 6 }}>
                <b>{r.winsA}</b>
                <span className="text-[11px] text-[var(--muted)]">
                  {r.drawn} {desktop ? (r.drawn === 1 ? 'empate' : 'empates') : 'E'}
                </span>
                <b>{r.winsB}</b>
              </div>
              <div className="h2h__s flex-row-reverse text-right">
                <Crest club={r.b} size={30} />
                <span>{desktop ? b.name : b.short}</span>
              </div>
            </div>
            <div className="split" aria-hidden>
              <i style={{ flex: Math.max(r.winsA, 0.0001), background: a.primary }} />
              <i style={{ flex: Math.max(r.drawn, 0.0001), background: '#59617D' }} />
              <i style={{ flex: Math.max(r.winsB, 0.0001), background: b.primary }} />
            </div>
            <div className="h2h__meta">
              <span>
                Goles {r.goalsA}–{r.goalsB} · último {r.lastScore[0]}–{r.lastScore[1]} ·{' '}
                {dayMonth(r.lastDate)}
              </span>
              <span className="font-bold text-[#E6DEFF]">{dom}</span>
            </div>
          </button>
        )
      })
    )

  if (desktop)
    return (
      <div className="flex flex-col gap-6">
        <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section className="flex flex-col gap-2.5">
            <BlockHead title="Clasificación" note="Victoria 3 · empate 1 · penaltis = victoria" />
            {tableEl}
            {tableNote}
          </section>
          <div className="flex flex-col gap-6">
            {points.months.length > 1 && (
              <section className="flex flex-col gap-2.5">
                <BlockHead small title="Puntos a lo largo del tiempo" note="Sigue al filtro" />
                <PointsChart data={points} />
              </section>
            )}
            <section className="flex flex-col gap-2.5">
              <h2 className="h-display h-s">Palmarés de copa</h2>
              <Palmares cups={cups} />
            </section>
          </div>
        </div>
        <section className="flex flex-col gap-2">
          <BlockHead title="Cara a cara" note="Los más disputados primero · toca para ver sus partidos" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-x-6">
            {h2hList}
          </div>
        </section>
      </div>
    )

  return (
    <div className="flex flex-col gap-2.5">
      <SubSeg
        label="Apartados"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'tabla', label: 'Clasificación' },
          { value: 'h2h', label: 'Cara a cara' },
          { value: 'palm', label: 'Palmarés' },
        ]}
      />
      {tab === 'tabla' && (
        <>
          {tableEl}
          {tableNote}
        </>
      )}
      {tab === 'h2h' && (
        <>
          {h2hList}
          <p className="note">Los más disputados primero. Toca uno para ver sus partidos.</p>
        </>
      )}
      {tab === 'palm' && <Palmares cups={cups} />}
    </div>
  )
}
