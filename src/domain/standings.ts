import { CLUBS } from './clubs'
import type { ClubId, Match } from './types'

export type Outcome = 'W' | 'D' | 'L'

export interface ClubRow {
  club: ClubId
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  /** Últimos resultados, del más antiguo al más reciente (máx. 5) */
  form: Outcome[]
}

export interface PlayerRow {
  id: string
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  mvps: number
  winRate: number
  /** Últimos resultados, del más antiguo al más reciente (máx. 5) */
  form: Outcome[]
}

export const isPlayed = (m: Match): m is Match & { scoreA: number; scoreB: number } =>
  m.scoreA !== null && m.scoreB !== null

/** Resultado para un lado del partido; en copa, el empate lo decide quién pasó */
export function resultFor(m: Match & { scoreA: number; scoreB: number }, side: 'A' | 'B'): Outcome {
  const [gf, ga] = side === 'A' ? [m.scoreA, m.scoreB] : [m.scoreB, m.scoreA]
  if (gf !== ga) return gf > ga ? 'W' : 'L'
  if (m.winner) return m.winner === (side === 'A' ? m.clubA : m.clubB) ? 'W' : 'L'
  return 'D'
}

const chronological = (matches: Match[]) =>
  matches.filter(isPlayed).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)

export function clubStandings(matches: Match[]): ClubRow[] {
  const rows = new Map<ClubId, ClubRow>(
    CLUBS.map((c) => [
      c.id,
      { club: c.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] },
    ]),
  )
  for (const m of chronological(matches)) {
    for (const [club, gf, ga, side] of [
      [m.clubA, m.scoreA, m.scoreB, 'A'],
      [m.clubB, m.scoreB, m.scoreA, 'B'],
    ] as const) {
      const row = rows.get(club)
      if (!row) continue
      const o = resultFor(m, side)
      row.played++
      row.goalsFor += gf
      row.goalsAgainst += ga
      if (o === 'W') row.won++
      else if (o === 'D') row.drawn++
      else row.lost++
      row.points += o === 'W' ? 3 : o === 'D' ? 1 : 0
      row.form = [...row.form, o].slice(-5)
    }
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.club.localeCompare(b.club),
  )
}

/** `names` permite mostrar el nombre actual aunque el jugador se haya renombrado */
export function playerStandings(matches: Match[], names: Map<string, string> = new Map()): PlayerRow[] {
  const rows = new Map<string, PlayerRow>()
  const row = (id: string, fallback: string) => {
    let r = rows.get(id)
    if (!r) {
      r = {
        id,
        name: names.get(id) ?? fallback,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        mvps: 0,
        winRate: 0,
        form: [],
      }
      rows.set(id, r)
    }
    return r
  }
  for (const m of chronological(matches)) {
    for (const [team, side] of [
      [m.teamA, 'A'],
      [m.teamB, 'B'],
    ] as const) {
      const o = resultFor(m, side)
      for (const p of team) {
        const r = row(p.id, p.name)
        r.played++
        if (o === 'W') r.won++
        else if (o === 'D') r.drawn++
        else r.lost++
        r.form = [...r.form, o].slice(-5)
      }
    }
    if (m.mvp) {
      const p = [...m.teamA, ...m.teamB].find((x) => x.id === m.mvp)
      if (p) row(p.id, p.name).mvps++
    }
  }
  for (const r of rows.values()) r.winRate = r.played ? r.won / r.played : 0
  return [...rows.values()].sort(
    (a, b) => b.won - a.won || b.winRate - a.winRate || b.mvps - a.mvps || a.name.localeCompare(b.name),
  )
}

export interface PointsSeries {
  /** Meses con partidos, YYYY-MM */
  months: string[]
  /** Puntos acumulados de cada club al final de cada mes */
  series: { club: ClubId; points: number[] }[]
}

/** Puntos acumulados por club mes a mes (victoria 3, empate 1), con los clubes de más a menos puntos */
export function pointsByMonth(matches: Match[]): PointsSeries {
  const played = chronological(matches)
  const months = [...new Set(played.map((m) => m.date.slice(0, 7)))]
  const totals = new Map<ClubId, number[]>(CLUBS.map((c) => [c.id, months.map(() => 0)]))
  for (const m of played) {
    const i = months.indexOf(m.date.slice(0, 7))
    for (const [club, side] of [
      [m.clubA, 'A'],
      [m.clubB, 'B'],
    ] as const) {
      const o = resultFor(m, side)
      totals.get(club)![i]! += o === 'W' ? 3 : o === 'D' ? 1 : 0
    }
  }
  const series = [...totals].map(([club, perMonth]) => {
    let acc = 0
    return { club, points: perMonth.map((p) => (acc += p)) }
  })
  return { months, series: series.sort((a, b) => (b.points.at(-1) ?? 0) - (a.points.at(-1) ?? 0)) }
}
