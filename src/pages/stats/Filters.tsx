import { Filter, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Crest, Seg, Switch } from '@/components/ui'
import { CLUBS } from '@/domain/clubs'
import type { Cup } from '@/domain/cup'
import {
  clearFilter,
  currentSeason,
  hasSubject,
  placesIn,
  removeChip,
  RESULT_LABEL,
  ROUND_LABEL,
  seasonLabel,
  seasonsIn,
  type DateFilter,
  type Mins,
  type PlayersMode,
  type ResultKey,
  type RoundKey,
  type StatsFilter,
} from '@/domain/filters'
import { isPlayed } from '@/domain/standings'
import type { ClubId, Match, Player } from '@/domain/types'
import type { StatsData } from '@/hooks/useStatsData'

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

function Opt({
  on,
  onClick,
  children,
  disabled,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button className="opt" type="button" aria-pressed={on} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function MinRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-2.5">
      <span className="text-[13px] font-semibold text-[var(--ink-2)]">{label}</span>
      <div className="mstep">
        <button
          type="button"
          aria-label={`Bajar ${label}`}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-live="polite">{value}</output>
        <button
          className="plus"
          type="button"
          aria-label={`Subir ${label}`}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Todos los filtros. Cada cambio se aplica al momento */
export function FilterForm({
  data,
  matches,
  players,
  cups,
}: {
  data: StatsData
  matches: Match[]
  players: Player[]
  cups: Cup[]
}) {
  const { filter: f, setFilter, now } = data
  const set = (patch: Partial<StatsFilter>) => setFilter({ ...f, ...patch })
  const [q, setQ] = useState('')
  const played = useMemo(() => matches.filter(isPlayed), [matches])
  const seasons = useMemo(() => seasonsIn(played), [played])
  const places = useMemo(() => placesIn(played), [played])
  const current = currentSeason(now)
  // Jugadores sugeridos: los que más han jugado
  const ranked = useMemo(() => {
    const games = new Map<string, number>()
    for (const m of played)
      for (const p of [...m.teamA, ...m.teamB]) games.set(p.id, (games.get(p.id) ?? 0) + 1)
    return players
      .filter((p) => games.has(p.id))
      .sort((a, b) => (games.get(b.id) ?? 0) - (games.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'es'))
  }, [played, players])
  const query = q.trim().toLowerCase()
  const shown = [
    ...f.players.map((id) => ({ id, name: data.names.player(id) })),
    ...ranked
      .filter((p) => !f.players.includes(p.id) && (!query || p.name.toLowerCase().includes(query)))
      .slice(0, query ? 12 : 8),
  ]

  const dates: { label: string; value: DateFilter }[] = [
    { label: 'Este mes', value: { kind: 'month' } },
    { label: 'Últimos 3 meses', value: { kind: 'quarter' } },
    { label: 'Esta temporada', value: { kind: 'season', start: current } },
    { label: 'Todo', value: { kind: 'all' } },
    ...seasons
      .filter((s) => s !== current)
      .map((s) => ({ label: seasonLabel(s), value: { kind: 'season', start: s } as DateFilter })),
  ]
  const sameDate = (a: DateFilter, b: DateFilter) => JSON.stringify(a) === JSON.stringify(b)
  const subject = hasSubject(f)
  const setMin = (k: keyof Mins) => (v: number) => set({ mins: { ...f.mins, [k]: v } })

  return (
    <div className="flex flex-col">
      <div className="fg">
        <h3>Competición</h3>
        <Seg
          label="Competición"
          value={f.comp}
          onChange={(comp) => set({ comp, ...(comp !== 'cup' ? { cupId: null, rounds: [] } : {}) })}
          options={[
            { value: 'all', label: 'Todo' },
            { value: 'friendly', label: 'Amistosos' },
            { value: 'cup', label: 'Copa' },
          ]}
        />
        {f.comp === 'cup' && (
          <div className="fsub">
            {cups.length > 1 && (
              <div className="opts" role="group" aria-label="Copa">
                {cups.map((c) => (
                  <Opt
                    key={c.id}
                    on={f.cupId === c.id}
                    onClick={() => set({ cupId: f.cupId === c.id ? null : c.id })}
                  >
                    {c.name}
                  </Opt>
                ))}
              </div>
            )}
            <div className="opts" role="group" aria-label="Ronda">
              {(Object.keys(ROUND_LABEL) as RoundKey[]).map((r) => (
                <Opt key={r} on={f.rounds.includes(r)} onClick={() => set({ rounds: toggle(f.rounds, r) })}>
                  {ROUND_LABEL[r]}
                </Opt>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fg">
        <h3>Fechas</h3>
        <div className="opts" role="group" aria-label="Fechas">
          {dates.map((d) => (
            <Opt key={d.label} on={sameDate(f.dates, d.value)} onClick={() => set({ dates: d.value })}>
              {d.label}
            </Opt>
          ))}
          <Opt
            on={f.dates.kind === 'range'}
            onClick={() =>
              set({ dates: f.dates.kind === 'range' ? { kind: 'all' } : { kind: 'range', from: '', to: '' } })
            }
          >
            Elegir fechas…
          </Opt>
        </div>
        {f.dates.kind === 'range' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="field">
              <label htmlFor="f-from">Desde</label>
              <input
                id="f-from"
                className="input"
                type="date"
                value={f.dates.from}
                onChange={(e) =>
                  set({
                    dates: {
                      kind: 'range',
                      from: e.target.value,
                      to: f.dates.kind === 'range' ? f.dates.to : '',
                    },
                  })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="f-to">Hasta</label>
              <input
                id="f-to"
                className="input"
                type="date"
                value={f.dates.to}
                onChange={(e) =>
                  set({
                    dates: {
                      kind: 'range',
                      to: e.target.value,
                      from: f.dates.kind === 'range' ? f.dates.from : '',
                    },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="fg">
        <h3>Jugadores</h3>
        <div className="search">
          <Search aria-hidden />
          <label className="sr" htmlFor="f-player">
            Buscar jugador
          </label>
          <input
            id="f-player"
            className="input"
            type="search"
            placeholder="Buscar jugador"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ height: 42 }}
          />
        </div>
        <div className="opts" role="group" aria-label="Jugadores">
          {shown.map((p) => (
            <Opt
              key={p.id}
              on={f.players.includes(p.id)}
              onClick={() => set({ players: toggle(f.players, p.id) })}
            >
              {p.name}
            </Opt>
          ))}
        </div>
        {f.players.length > 1 && (
          <Seg<PlayersMode>
            label="Cómo combinar los jugadores"
            value={f.playersMode}
            onChange={(playersMode) => set({ playersMode })}
            options={[
              { value: 'any', label: 'Jugó alguno' },
              { value: 'together', label: 'Juntos' },
              { value: 'against', label: 'Enfrentados' },
            ]}
          />
        )}
      </div>

      <div className="fg">
        <h3>Clubes</h3>
        <div className="opts" role="group" aria-label="Clubes">
          {CLUBS.map((c) => (
            <Opt
              key={c.id}
              on={f.clubs.includes(c.id)}
              onClick={() => set({ clubs: toggle<ClubId>(f.clubs, c.id) })}
            >
              <Crest club={c.id} size={20} />
              {c.short}
            </Opt>
          ))}
        </div>
        {f.clubs.length > 1 && <p className="note">Con dos o más clubes: solo los partidos entre ellos.</p>}
      </div>

      {places.length > 0 && (
        <div className="fg">
          <h3>Campo</h3>
          <div className="opts" role="group" aria-label="Campo">
            {places.map((p) => (
              <Opt key={p} on={f.places.includes(p)} onClick={() => set({ places: toggle(f.places, p) })}>
                {p}
              </Opt>
            ))}
          </div>
        </div>
      )}

      <div className="fg">
        <h3>Resultado</h3>
        <div className="opts" role="group" aria-label="Resultado">
          {(Object.keys(RESULT_LABEL) as ResultKey[]).map((r) => (
            <Opt
              key={r}
              on={f.results.includes(r)}
              disabled={!subject && (r === 'won' || r === 'lost')}
              onClick={() => set({ results: toggle(f.results, r) })}
            >
              {RESULT_LABEL[r]}
            </Opt>
          ))}
        </div>
        <p className="note">
          {subject
            ? 'Ganados, empatados y perdidos: desde el lado del primer jugador o club filtrado.'
            : 'Elige un jugador o un club para filtrar por ganados o perdidos.'}
        </p>
      </div>

      <div className="fg">
        <h3>Goleadores</h3>
        <Switch
          checked={f.withScorers}
          onChange={(withScorers) => set({ withScorers })}
          label={<span className="flex-1 text-sm font-semibold">Solo partidos con goleadores apuntados</span>}
        />
      </div>

      <div className="fg">
        <h3>Mínimo de partidos</h3>
        <MinRow label="% de victorias" value={f.mins.winRate} onChange={setMin('winRate')} />
        <MinRow label="Parejas" value={f.mins.duo} onChange={setMin('duo')} />
        <MinRow label="Compañeros y rivales" value={f.mins.mates} onChange={setMin('mates')} />
      </div>
    </div>
  )
}

/** Botón «Filtros» con el número de filtros activos */
export function FilterButton({
  count,
  onClick,
  label,
}: {
  count: number
  onClick: () => void
  label?: boolean
}) {
  return (
    <button
      className="fbtn"
      type="button"
      onClick={onClick}
      aria-label={label === false ? `Filtros, ${count} activos` : undefined}
    >
      <Filter aria-hidden />
      {label !== false && 'Filtros'}
      {count > 0 && <b>{count}</b>}
    </button>
  )
}

/** Chips de los filtros activos, cada uno con su ✕ */
export function FilterChips({ data }: { data: StatsData }) {
  return (
    <>
      {data.chips.map((c) => (
        <span key={c.key} className="fchip">
          {c.label}
          <button
            type="button"
            aria-label={`Quitar filtro ${c.label}`}
            onClick={() => data.setFilter(removeChip(data.filter, c.key))}
          >
            ✕
          </button>
        </span>
      ))}
    </>
  )
}

export function FilterCount({ data, className }: { data: StatsData; className?: string }) {
  return (
    <span className={`fcount ${className ?? ''}`}>
      <strong style={data.filtered.length === 0 ? { color: '#FFB3BB' } : undefined}>
        {data.filtered.length}
      </strong>{' '}
      de {data.total} partidos
    </span>
  )
}

/** Móvil: hoja inferior con todos los filtros */
export function FilterSheet({
  open,
  onClose,
  data,
  matches,
  players,
  cups,
}: {
  open: boolean
  onClose: () => void
  data: StatsData
  matches: Match[]
  players: Player[]
  cups: Cup[]
}) {
  const n = data.filtered.length
  return (
    <Sheet open={open} onClose={onClose} title="Filtros">
      <div className="mb-2 flex flex-col gap-1.5">
        <FilterCount data={data} />
        <div className="fmeter" aria-hidden>
          <i style={{ width: `${data.total ? (n / data.total) * 100 : 0}%` }} />
        </div>
        {data.chips.length > 0 && (
          <div className="fchips mt-1">
            <FilterChips data={data} />
          </div>
        )}
      </div>
      <FilterForm data={data} matches={matches} players={players} cups={cups} />
      <div
        className="sticky bottom-0 grid grid-cols-[auto_1fr] gap-2.5 pt-3.5 pb-1.5"
        style={{ background: 'linear-gradient(180deg, rgba(8,15,36,0), #0A1330 30%)' }}
      >
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => data.setFilter(clearFilter(data.filter))}
        >
          Quitar filtros
        </button>
        <button className="btn btn--primary h-[52px]" type="button" onClick={onClose}>
          Ver {n} {n === 1 ? 'partido' : 'partidos'}
        </button>
      </div>
    </Sheet>
  )
}

/** Escritorio: panel lateral con todos los filtros */
export function FilterPanel({
  data,
  matches,
  players,
  cups,
}: {
  data: StatsData
  matches: Match[]
  players: Player[]
  cups: Cup[]
}) {
  return (
    <aside className="fpanel w-[330px] shrink-0 self-start" aria-label="Filtros">
      <div className="flex items-center justify-between">
        <h2 className="h-display h-m">Filtros</h2>
        {data.chips.length > 0 && (
          <button className="fclear" type="button" onClick={() => data.setFilter(clearFilter(data.filter))}>
            Quitar filtros
          </button>
        )}
      </div>
      {data.chips.length > 0 && (
        <div className="fchips pb-2.5">
          <FilterChips data={data} />
        </div>
      )}
      <FilterForm data={data} matches={matches} players={players} cups={cups} />
    </aside>
  )
}
