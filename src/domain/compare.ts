import { titles, type Cup } from './cup'
import { goalSummary, scorerTable } from './goals'
import { playerProfile } from './profile'
import { clubStandings } from './standings'
import type { ClubId, Match } from './types'

export type CompareFormat = 'int' | 'pct' | 'dec' | 'streak'

export interface CompareRow {
  label: string
  a: number
  b: number
  /** Qué es mejor: más (`high`) o menos (`low`) */
  better: 'high' | 'low'
  format: CompareFormat
}

/** Quién gana la cifra; null si empatan */
export function rowWinner(r: CompareRow): 'a' | 'b' | null {
  if (r.a === r.b) return null
  return r.a > r.b === (r.better === 'high') ? 'a' : 'b'
}

/** «66 %», «1,27», «7V» */
export function formatCompare(v: number, f: CompareFormat): string {
  if (f === 'pct') return `${Math.round(v)} %`
  if (f === 'dec') return v.toFixed(2).replace('.', ',')
  if (f === 'streak') return `${v}V`
  return String(v)
}

/** Cifras de dos jugadores lado a lado (las de goles, solo si hay partidos con goleadores) */
export function playerComparison(matches: Match[], a: string, b: string): CompareRow[] {
  const pa = playerProfile(matches, a)
  const pb = playerProfile(matches, b)
  const table = scorerTable(matches)
  const ga = table.find((r) => r.id === a)
  const gb = table.find((r) => r.id === b)
  const current = (p: typeof pa) => (p.streak?.kind === 'W' ? p.streak.count : 0)
  const rows: CompareRow[] = [
    { label: 'Partidos', a: pa.played, b: pb.played, better: 'high', format: 'int' },
    { label: 'Victorias', a: pa.won, b: pb.won, better: 'high', format: 'int' },
    { label: '% victorias', a: pa.winRate * 100, b: pb.winRate * 100, better: 'high', format: 'pct' },
    { label: 'MVP', a: pa.mvps, b: pb.mvps, better: 'high', format: 'int' },
  ]
  if (goalSummary(matches).matches > 0)
    rows.push(
      { label: 'Goles', a: ga?.goals ?? 0, b: gb?.goals ?? 0, better: 'high', format: 'int' },
      { label: 'Goles / partido', a: ga?.perMatch ?? 0, b: gb?.perMatch ?? 0, better: 'high', format: 'dec' },
    )
  rows.push(
    { label: 'Mejor racha', a: pa.bestWinStreak, b: pb.bestWinStreak, better: 'high', format: 'streak' },
    { label: 'Racha actual', a: current(pa), b: current(pb), better: 'high', format: 'streak' },
    { label: 'Derrotas', a: pa.lost, b: pb.lost, better: 'low', format: 'int' },
  )
  if (goalSummary(matches).matches > 0)
    rows.push({
      label: 'Partidos con gol',
      a: ga?.withGoal ?? 0,
      b: gb?.withGoal ?? 0,
      better: 'high',
      format: 'int',
    })
  return rows
}

/** Cifras de dos clubes lado a lado */
export function clubComparison(matches: Match[], cups: Cup[], a: ClubId, b: ClubId): CompareRow[] {
  const table = clubStandings(matches)
  const ra = table.find((r) => r.club === a)!
  const rb = table.find((r) => r.club === b)!
  const won = titles(cups)
  const pct = (r: typeof ra) => (r.played ? (r.won / r.played) * 100 : 0)
  return [
    { label: 'Partidos', a: ra.played, b: rb.played, better: 'high', format: 'int' },
    { label: 'Victorias', a: ra.won, b: rb.won, better: 'high', format: 'int' },
    { label: '% victorias', a: pct(ra), b: pct(rb), better: 'high', format: 'pct' },
    { label: 'Puntos', a: ra.points, b: rb.points, better: 'high', format: 'int' },
    { label: 'Goles a favor', a: ra.goalsFor, b: rb.goalsFor, better: 'high', format: 'int' },
    { label: 'Goles en contra', a: ra.goalsAgainst, b: rb.goalsAgainst, better: 'low', format: 'int' },
    { label: 'Derrotas', a: ra.lost, b: rb.lost, better: 'low', format: 'int' },
    { label: 'Títulos de copa', a: won.get(a) ?? 0, b: won.get(b) ?? 0, better: 'high', format: 'int' },
  ]
}
