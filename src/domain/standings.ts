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

const outcome = (gf: number, ga: number): Outcome => (gf > ga ? 'W' : gf < ga ? 'L' : 'D')

const chronological = (matches: Match[]) =>
  matches.filter(isPlayed).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)

export function clubStandings(matches: Match[]): ClubRow[] {
  const rows = new Map<ClubId, ClubRow>(
    CLUBS.map((c) => [
      c.id,
      { club: c.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
    ]),
  )
  for (const m of chronological(matches)) {
    for (const [club, gf, ga] of [
      [m.clubA, m.scoreA, m.scoreB],
      [m.clubB, m.scoreB, m.scoreA],
    ] as const) {
      const row = rows.get(club)
      if (!row) continue
      const o = outcome(gf, ga)
      row.played++
      row.goalsFor += gf
      row.goalsAgainst += ga
      if (o === 'W') row.won++
      else if (o === 'D') row.drawn++
      else row.lost++
      row.points += o === 'W' ? 3 : o === 'D' ? 1 : 0
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
    for (const [team, gf, ga] of [
      [m.teamA, m.scoreA, m.scoreB],
      [m.teamB, m.scoreB, m.scoreA],
    ] as const) {
      const o = outcome(gf, ga)
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
