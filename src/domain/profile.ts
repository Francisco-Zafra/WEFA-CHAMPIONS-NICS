import { isPlayed, resultFor, type Outcome } from './standings'
import type { ClubId, Match } from './types'

/** Partidos mínimos juntos / enfrentados para que una relación cuente como «mejor» o «peor» */
export const MIN_GAMES = 2

export interface PlayerGame {
  match: Match
  club: ClubId
  rivalClub: ClubId
  outcome: Outcome
  goalsFor: number
  goalsAgainst: number
  /** Compañeros de equipo (sin él) */
  mates: { id: string; name: string }[]
  /** Rivales */
  rivals: { id: string; name: string }[]
  mvp: boolean
}

/** Partidos jugados (con resultado) del jugador, del más antiguo al más reciente */
export function gamesOf(matches: Match[], playerId: string): PlayerGame[] {
  const out: PlayerGame[] = []
  const sorted = matches
    .filter(isPlayed)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  for (const m of sorted) {
    const inA = m.teamA.some((p) => p.id === playerId)
    const inB = m.teamB.some((p) => p.id === playerId)
    if (!inA && !inB) continue
    const [mine, theirs] = inA ? [m.teamA, m.teamB] : [m.teamB, m.teamA]
    const [gf, ga] = inA ? [m.scoreA, m.scoreB] : [m.scoreB, m.scoreA]
    out.push({
      match: m,
      club: inA ? m.clubA : m.clubB,
      rivalClub: inA ? m.clubB : m.clubA,
      outcome: resultFor(m, inA ? 'A' : 'B'),
      goalsFor: gf,
      goalsAgainst: ga,
      mates: mine.filter((p) => p.id !== playerId).map(({ id, name }) => ({ id, name })),
      rivals: theirs.map(({ id, name }) => ({ id, name })),
      mvp: m.mvp === playerId,
    })
  }
  return out
}

export interface Relation {
  id: string
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  winRate: number
}

function relations(games: PlayerGame[], pick: (g: PlayerGame) => { id: string; name: string }[]): Relation[] {
  const map = new Map<string, Relation>()
  for (const g of games)
    for (const o of pick(g)) {
      const r = map.get(o.id) ?? { id: o.id, name: o.name, played: 0, won: 0, drawn: 0, lost: 0, winRate: 0 }
      r.played++
      if (g.outcome === 'W') r.won++
      else if (g.outcome === 'D') r.drawn++
      else r.lost++
      r.name = o.name
      map.set(o.id, r)
    }
  for (const r of map.values()) r.winRate = r.played ? r.won / r.played : 0
  return [...map.values()]
}

const byWinRate = (a: Relation, b: Relation) =>
  b.winRate - a.winRate || b.played - a.played || a.name.localeCompare(b.name)

export interface Streak {
  kind: Outcome
  count: number
}

export interface PlayerProfile {
  played: number
  won: number
  drawn: number
  lost: number
  winRate: number
  mvps: number
  goalsFor: number
  goalsAgainst: number
  /** Últimos 5, del más antiguo al más reciente */
  form: Outcome[]
  streak: Streak | null
  /** Mejor racha de victorias */
  bestWinStreak: number
  /** Con quién gana más / menos (mín. MIN_GAMES partidos juntos) */
  bestPartners: Relation[]
  worstPartners: Relation[]
  /** Contra quién gana más (víctimas) / menos (bestias negras) */
  victims: Relation[]
  nemeses: Relation[]
  clubs: { club: ClubId; played: number; won: number }[]
  /** Del más reciente al más antiguo */
  recent: PlayerGame[]
}

export function playerProfile(matches: Match[], playerId: string): PlayerProfile {
  const games = gamesOf(matches, playerId)
  const count = (o: Outcome) => games.filter((g) => g.outcome === o).length
  const played = games.length

  let streak: Streak | null = null
  for (let i = games.length - 1; i >= 0; i--) {
    const o = games[i]!.outcome
    if (!streak) streak = { kind: o, count: 1 }
    else if (streak.kind === o) streak.count++
    else break
  }
  let best = 0
  let run = 0
  for (const g of games) {
    run = g.outcome === 'W' ? run + 1 : 0
    best = Math.max(best, run)
  }

  const partners = relations(games, (g) => g.mates).filter((r) => r.played >= MIN_GAMES)
  const against = relations(games, (g) => g.rivals).filter((r) => r.played >= MIN_GAMES)
  const clubs = new Map<ClubId, { club: ClubId; played: number; won: number }>()
  for (const g of games) {
    const c = clubs.get(g.club) ?? { club: g.club, played: 0, won: 0 }
    c.played++
    if (g.outcome === 'W') c.won++
    clubs.set(g.club, c)
  }

  return {
    played,
    won: count('W'),
    drawn: count('D'),
    lost: count('L'),
    winRate: played ? count('W') / played : 0,
    mvps: games.filter((g) => g.mvp).length,
    goalsFor: games.reduce((a, g) => a + g.goalsFor, 0),
    goalsAgainst: games.reduce((a, g) => a + g.goalsAgainst, 0),
    form: games.slice(-5).map((g) => g.outcome),
    streak,
    bestWinStreak: best,
    // «Mejores»/«víctimas» solo con victorias; «peores»/«bestias negras» solo con derrotas
    bestPartners: partners
      .filter((r) => r.won > 0)
      .sort(byWinRate)
      .slice(0, 3),
    worstPartners: partners
      .filter((r) => r.lost > 0)
      .sort((a, b) => -byWinRate(a, b))
      .slice(0, 3),
    victims: against
      .filter((r) => r.won > 0)
      .sort(byWinRate)
      .slice(0, 3),
    nemeses: against
      .filter((r) => r.lost > 0)
      .sort((a, b) => -byWinRate(a, b))
      .slice(0, 3),
    clubs: [...clubs.values()].sort((a, b) => b.played - a.played),
    recent: [...games].reverse().slice(0, 6),
  }
}

export interface Rivalry {
  a: ClubId
  b: ClubId
  played: number
  winsA: number
  winsB: number
  drawn: number
  goalsA: number
  goalsB: number
  lastDate: string
  /** Último resultado desde el punto de vista de `a` */
  lastScore: [number, number]
}

/** Historial cara a cara entre clubes (partidos con resultado), los más disputados primero */
export function rivalries(matches: Match[]): Rivalry[] {
  const map = new Map<string, Rivalry>()
  const sorted = matches
    .filter(isPlayed)
    .sort((x, y) => x.date.localeCompare(y.date) || x.createdAt - y.createdAt)
  for (const m of sorted) {
    const swap = m.clubA > m.clubB
    const [a, b] = swap ? [m.clubB, m.clubA] : [m.clubA, m.clubB]
    const [ga, gb] = swap ? [m.scoreB, m.scoreA] : [m.scoreA, m.scoreB]
    const key = `${a}|${b}`
    const r = map.get(key) ?? {
      a,
      b,
      played: 0,
      winsA: 0,
      winsB: 0,
      drawn: 0,
      goalsA: 0,
      goalsB: 0,
      lastDate: '',
      lastScore: [0, 0] as [number, number],
    }
    r.played++
    r.goalsA += ga
    r.goalsB += gb
    const o = resultFor(m, swap ? 'B' : 'A')
    if (o === 'W') r.winsA++
    else if (o === 'L') r.winsB++
    else r.drawn++
    r.lastDate = m.date
    r.lastScore = [ga, gb]
    map.set(key, r)
  }
  return [...map.values()].sort((x, y) => y.played - x.played || y.lastDate.localeCompare(x.lastDate))
}
