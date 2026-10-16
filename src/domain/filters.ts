import { getClub } from './clubs'
import { roundOf } from './cup'
import { hasScorers } from './goals'
import { isPlayed, resultFor } from './standings'
import type { ClubId, Match } from './types'

// ---------- Temporadas ----------

/**
 * Una temporada va de septiembre a junio (como en el fútbol); julio y agosto cuentan para la que
 * acaba. Se identifica por el año en que empieza: 2025 = «2025/26»
 */
export function seasonOf(iso: string): number {
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7))
  return m >= 9 ? y : y - 1
}

export const seasonLabel = (start: number) => `${start}/${String((start + 1) % 100).padStart(2, '0')}`

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const currentSeason = (now: Date) => seasonOf(isoOf(now))

/** Temporadas con partidos, de la más reciente a la más antigua */
export function seasonsIn(matches: Match[]): number[] {
  return [...new Set(matches.filter((m) => m.date).map((m) => seasonOf(m.date)))].sort((a, b) => b - a)
}

// ---------- Filtro ----------

export type Competition = 'all' | 'friendly' | 'cup'
export type RoundKey = 'qf' | 'sf' | 'f'
export type DateFilter =
  | { kind: 'all' }
  /** Este mes */
  | { kind: 'month' }
  /** Últimos 3 meses */
  | { kind: 'quarter' }
  | { kind: 'season'; start: number }
  | { kind: 'range'; from: string; to: string }
/** Con varios jugadores: que jugara alguno, todos juntos o el primero contra los demás */
export type PlayersMode = 'any' | 'together' | 'against'
export type ResultKey = 'won' | 'drawn' | 'lost' | 'pens' | 'close' | 'rout'

/** Partidos mínimos para entrar en los rankings y récords */
export interface Mins {
  winRate: number
  duo: number
  mates: number
}

export const DEFAULT_MINS: Mins = { winRate: 5, duo: 3, mates: 2 }

export interface StatsFilter {
  comp: Competition
  /** Con `comp: 'cup'`: una copa concreta */
  cupId: string | null
  rounds: RoundKey[]
  dates: DateFilter
  players: string[]
  playersMode: PlayersMode
  clubs: ClubId[]
  places: string[]
  results: ResultKey[]
  withScorers: boolean
  mins: Mins
}

/** Sin ningún filtro */
export const emptyFilter = (): StatsFilter => ({
  comp: 'all',
  cupId: null,
  rounds: [],
  dates: { kind: 'all' },
  players: [],
  playersMode: 'together',
  clubs: [],
  places: [],
  results: [],
  withScorers: false,
  mins: { ...DEFAULT_MINS },
})

/** Lo que se ve al entrar en Estadísticas: la temporada en curso */
export const defaultFilter = (now: Date): StatsFilter => ({
  ...emptyFilter(),
  dates: { kind: 'season', start: currentSeason(now) },
})

export const ROUND_LABEL: Record<RoundKey, string> = { qf: 'Cuartos', sf: 'Semis', f: 'Final' }

export const RESULT_LABEL: Record<ResultKey, string> = {
  won: 'Ganados',
  drawn: 'Empatados',
  lost: 'Perdidos',
  pens: 'Penaltis',
  close: 'Igualados (0–1)',
  rout: 'Goleadas',
}

/** Diferencia a partir de la que un partido es goleada */
export const ROUT_MARGIN = 4

const sideOf = (m: Match, id: string): 'A' | 'B' | null =>
  m.teamA.some((p) => p.id === id) ? 'A' : m.teamB.some((p) => p.id === id) ? 'B' : null

/** Lado desde el que se miran «ganados», «empatados» y «perdidos»: el del jugador o club filtrado */
export function subjectSide(m: Match, f: StatsFilter): 'A' | 'B' | null {
  if (f.players.length) return sideOf(m, f.players[0]!)
  if (f.clubs.length) return m.clubA === f.clubs[0] ? 'A' : m.clubB === f.clubs[0] ? 'B' : null
  return null
}

/** Hay alguien desde cuyo lado mirar el resultado */
export const hasSubject = (f: Pick<StatsFilter, 'players' | 'clubs'>) =>
  f.players.length > 0 || f.clubs.length > 0

const monthsBefore = (now: Date, n: number) =>
  isoOf(new Date(now.getFullYear(), now.getMonth() - n, now.getDate()))

function inDates(m: Match, d: DateFilter, now: Date): boolean {
  if (d.kind === 'all') return true
  if (d.kind === 'month') return m.date.slice(0, 7) === isoOf(now).slice(0, 7)
  if (d.kind === 'quarter') return m.date >= monthsBefore(now, 3) && m.date <= isoOf(now)
  if (d.kind === 'season') return seasonOf(m.date) === d.start
  return (!d.from || m.date >= d.from) && (!d.to || m.date <= d.to)
}

function playersMatch(m: Match, f: StatsFilter): boolean {
  const sides = f.players.map((id) => sideOf(m, id))
  if (f.players.length <= 1 || f.playersMode === 'any') return sides.some((s) => s !== null)
  if (sides.some((s) => s === null)) return false
  if (f.playersMode === 'together') return sides.every((s) => s === sides[0])
  return sides.slice(1).every((s) => s !== sides[0])
}

function clubsMatch(m: Match, clubs: ClubId[]): boolean {
  if (clubs.length === 1) return m.clubA === clubs[0] || m.clubB === clubs[0]
  return clubs.includes(m.clubA) && clubs.includes(m.clubB)
}

function resultMatch(m: Match & { scoreA: number; scoreB: number }, f: StatsFilter, key: ResultKey): boolean {
  const margin = Math.abs(m.scoreA - m.scoreB)
  if (key === 'pens') return !!m.winner && margin === 0
  if (key === 'close') return margin <= 1
  if (key === 'rout') return margin >= ROUT_MARGIN
  const side = subjectSide(m, f)
  if (!side) return key === 'drawn' ? margin === 0 && !m.winner : true
  const o = resultFor(m, side)
  return key === 'won' ? o === 'W' : key === 'lost' ? o === 'L' : o === 'D'
}

/** Partidos jugados que cumplen el filtro */
export function applyFilter(matches: Match[], f: StatsFilter, now: Date): Match[] {
  return matches.filter(isPlayed).filter((m) => {
    if (f.comp === 'friendly' && m.cup) return false
    if (f.comp === 'cup') {
      if (!m.cup) return false
      if (f.cupId && m.cup.id !== f.cupId) return false
      if (f.rounds.length && !f.rounds.includes(roundOf(m.cup.tie).key)) return false
    }
    if (!inDates(m, f.dates, now)) return false
    if (f.players.length && !playersMatch(m, f)) return false
    if (f.clubs.length && !clubsMatch(m, f.clubs)) return false
    if (f.places.length && !(m.place && f.places.includes(m.place))) return false
    if (f.results.length && !f.results.some((r) => resultMatch(m, f, r))) return false
    if (f.withScorers && !hasScorers(m)) return false
    return true
  })
}

// ---------- Chips de filtros activos ----------

export type ChipKey =
  | 'comp'
  | 'dates'
  | 'players'
  | 'scorers'
  | `round:${RoundKey}`
  | `club:${ClubId}`
  | `place:${string}`
  | `result:${ResultKey}`

export interface FilterChip {
  key: ChipKey
  label: string
}

export interface ChipNames {
  player: (id: string) => string
  cup: (id: string) => string
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`

export function dateLabel(d: DateFilter): string | null {
  if (d.kind === 'all') return null
  if (d.kind === 'month') return 'Este mes'
  if (d.kind === 'quarter') return 'Últimos 3 meses'
  if (d.kind === 'season') return `Temporada ${seasonLabel(d.start)}`
  if (d.from && d.to) return `${dayMonth(d.from)} – ${dayMonth(d.to)}`
  if (d.from) return `Desde el ${dayMonth(d.from)}`
  if (d.to) return `Hasta el ${dayMonth(d.to)}`
  return null
}

export function playersLabel(f: Pick<StatsFilter, 'players' | 'playersMode'>, name: (id: string) => string) {
  const names = f.players.map(name)
  if (names.length <= 1) return names[0] ?? ''
  const list = `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
  if (f.playersMode === 'together') return `${list} juntos`
  if (f.playersMode === 'against') return `${names[0]} contra ${names.slice(1).join(' y ')}`
  return `${names.slice(0, -1).join(', ')} o ${names[names.length - 1]}`
}

/** Filtros activos, en el orden en que se muestran */
export function filterChips(f: StatsFilter, names: ChipNames): FilterChip[] {
  const out: FilterChip[] = []
  if (f.comp === 'friendly') out.push({ key: 'comp', label: 'Solo amistosos' })
  if (f.comp === 'cup') out.push({ key: 'comp', label: f.cupId ? names.cup(f.cupId) : 'Solo copa' })
  if (f.comp === 'cup') for (const r of f.rounds) out.push({ key: `round:${r}`, label: ROUND_LABEL[r] })
  const d = dateLabel(f.dates)
  if (d) out.push({ key: 'dates', label: d })
  if (f.players.length) out.push({ key: 'players', label: playersLabel(f, names.player) })
  for (const c of f.clubs) out.push({ key: `club:${c}`, label: getClub(c).short })
  for (const p of f.places) out.push({ key: `place:${p}`, label: p })
  for (const r of f.results) out.push({ key: `result:${r}`, label: RESULT_LABEL[r] })
  if (f.withScorers) out.push({ key: 'scorers', label: 'Con goleadores' })
  return out
}

/** El filtro sin ese chip */
export function removeChip(f: StatsFilter, key: ChipKey): StatsFilter {
  if (key === 'comp') return { ...f, comp: 'all', cupId: null, rounds: [] }
  if (key === 'dates') return { ...f, dates: { kind: 'all' } }
  if (key === 'players') return { ...f, players: [] }
  if (key === 'scorers') return { ...f, withScorers: false }
  const [kind, value] = key.split(':') as [string, string]
  if (kind === 'round') return { ...f, rounds: f.rounds.filter((r) => r !== value) }
  if (kind === 'club') return { ...f, clubs: f.clubs.filter((c) => c !== value) }
  if (kind === 'place') return { ...f, places: f.places.filter((p) => p !== value) }
  return { ...f, results: f.results.filter((r) => r !== value) }
}

/** Quita todos los filtros, pero conserva los mínimos elegidos */
export const clearFilter = (f: StatsFilter): StatsFilter => ({ ...emptyFilter(), mins: f.mins })

export interface Suggestion {
  /** Chip que se quita */
  chip: FilterChip
  filter: StatsFilter
  count: number
}

/**
 * Con un filtro que deja sin partidos: qué pasa al quitar cada chip, del último al primero.
 * Solo los que dejan algún partido, con más partidos primero a igualdad de orden
 */
export function relaxations(matches: Match[], f: StatsFilter, names: ChipNames, now: Date): Suggestion[] {
  return filterChips(f, names)
    .reverse()
    .map((chip) => {
      const filter = removeChip(f, chip.key)
      return { chip, filter, count: applyFilter(matches, filter, now).length }
    })
    .filter((s) => s.count > 0)
}

/** Campos donde se ha jugado, del más usado al menos */
export function placesIn(matches: Match[]): string[] {
  const count = new Map<string, number>()
  for (const m of matches) if (m.place) count.set(m.place, (count.get(m.place) ?? 0) + 1)
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).map(([p]) => p)
}
