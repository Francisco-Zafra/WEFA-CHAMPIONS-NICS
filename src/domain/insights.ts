import { gamesOf, type PlayerGame } from './profile'
import { isPlayed, resultFor, type Outcome } from './standings'
import type { Match, MatchPlayer, Player } from './types'
import { pairKey } from './variety'

type Played = Match & { scoreA: number; scoreB: number }

const byDate = (x: Match, y: Match) => x.date.localeCompare(y.date) || x.createdAt - y.createdAt
const playedWithTeams = (matches: Match[]): Played[] =>
  matches.filter(isPlayed).filter((m) => m.teamA.length > 0 && m.teamB.length > 0)
const avg = (team: MatchPlayer[]) => team.reduce((a, p) => a + p.rating, 0) / team.length
const points = (o: Outcome) => (o === 'W' ? 1 : o === 'D' ? 0.5 : 0)

/**
 * Probabilidad esperada de ganar (empate = media victoria) según la diferencia de medias de equipo.
 * Escala tipo Elo: con 10 puntos de ventaja se espera ~76 %; con la diferencia típica del sorteo
 * (1–3 puntos) queda entre 51 % y 58 %
 */
export function expectedScore(ratingDiff: number): number {
  return 1 / (1 + 10 ** (-ratingDiff / 20))
}

// ---------- Calibración de medias ----------

/** Partidos mínimos con su media actual para sugerir un cambio */
export const CALIBRATION_MIN_GAMES = 5
/** Peso de la duda: equivale a sumar estos partidos «neutros» antes de sacar conclusiones */
const CALIBRATION_PRIOR = 5
const CALIBRATION_SCALE = 15
const CALIBRATION_MAX = 3
/**
 * Lo lejos que tiene que estar de lo esperado (en desviaciones típicas) para no ser suerte.
 * Con resultados al azar, solo ~1 de cada 20 jugadores lo supera
 */
const CALIBRATION_Z = 1.65

export interface Calibration {
  id: string
  name: string
  rating: number
  /** Partidos jugados con su media actual */
  played: number
  won: number
  drawn: number
  lost: number
  /** Puntos esperados por partido (0–1) con las medias de cada equipo */
  expected: number
  /** Puntos conseguidos por partido (0–1) */
  actual: number
  /** Cambio sugerido de media (0 = encaja) */
  delta: number
}

/**
 * Compara lo que cada jugador gana con lo que se esperaba de las medias de los equipos en que jugó.
 * Solo cuenta los partidos jugados con su media actual: al cambiarla, la cuenta empieza de cero
 */
export function calibrate(matches: Match[], players: Player[]): Calibration[] {
  const current = new Map(players.map((p) => [p.id, p]))
  const acc = new Map<
    string,
    { played: number; won: number; drawn: number; lost: number; exp: number; variance: number }
  >()
  for (const m of playedWithTeams(matches)) {
    const eA = expectedScore(avg(m.teamA) - avg(m.teamB))
    for (const [team, side, e] of [
      [m.teamA, 'A', eA],
      [m.teamB, 'B', 1 - eA],
    ] as const) {
      const o = resultFor(m, side)
      for (const mp of team) {
        const p = current.get(mp.id)
        if (!p || p.rating !== mp.rating) continue
        const r = acc.get(mp.id) ?? { played: 0, won: 0, drawn: 0, lost: 0, exp: 0, variance: 0 }
        r.played++
        r.exp += e
        r.variance += e * (1 - e)
        if (o === 'W') r.won++
        else if (o === 'D') r.drawn++
        else r.lost++
        acc.set(mp.id, r)
      }
    }
  }
  const out: Calibration[] = []
  for (const [id, r] of acc) {
    const p = current.get(id)!
    const got = r.won + r.drawn / 2
    const surplus = got - r.exp
    const raw = Math.round((surplus / (r.played + CALIBRATION_PRIOR)) * CALIBRATION_SCALE)
    const clear = Math.abs(surplus) >= CALIBRATION_Z * Math.sqrt(r.variance)
    const delta =
      r.played < CALIBRATION_MIN_GAMES || !clear
        ? 0
        : Math.max(-CALIBRATION_MAX, Math.min(CALIBRATION_MAX, raw))
    out.push({
      id,
      name: p.name,
      rating: p.rating,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      expected: r.exp / r.played,
      actual: got / r.played,
      delta: Math.max(1, Math.min(99, p.rating + delta)) - p.rating,
    })
  }
  return out.sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.played - a.played || a.name.localeCompare(b.name),
  )
}

// ---------- Igualdad de los sorteos ----------

export interface DrawQuality {
  /** Partidos con equipos y resultado */
  played: number
  /** Decididos por 0 o 1 gol */
  close: number
  /** Diferencia media de goles */
  avgMargin: number
  /** Diferencia media de medias entre equipos */
  avgGap: number
  /** Partidos con favorito claro (≥ 0,5 puntos de media) que no acabaron en empate */
  decided: number
  /** De esos, cuántos ganó el favorito */
  favoriteWon: number
  draws: number
  /** Partidos por diferencia de goles: 0, 1, 2, 3 y 4 o más */
  margins: [number, number, number, number, number]
}

export function drawQuality(matches: Match[]): DrawQuality {
  const ms = playedWithTeams(matches)
  const q: DrawQuality = {
    played: ms.length,
    close: 0,
    avgMargin: 0,
    avgGap: 0,
    decided: 0,
    favoriteWon: 0,
    draws: 0,
    margins: [0, 0, 0, 0, 0],
  }
  for (const m of ms) {
    const margin = Math.abs(m.scoreA - m.scoreB)
    const gap = avg(m.teamA) - avg(m.teamB)
    q.avgMargin += margin
    q.margins[Math.min(margin, 4)]!++
    q.avgGap += Math.abs(gap)
    if (margin <= 1) q.close++
    const o = resultFor(m, 'A')
    if (o === 'D') q.draws++
    else if (Math.abs(gap) >= 0.5) {
      q.decided++
      if ((o === 'W') === gap > 0) q.favoriteWon++
    }
  }
  if (ms.length) {
    q.avgMargin /= ms.length
    q.avgGap /= ms.length
  }
  return q
}

// ---------- Récords ----------

export interface MatchRecord {
  match: Played
  value: number
}

export interface PlayerRecord {
  ids: string[]
  names: string[]
  value: number
  /** Texto secundario (p. ej. «8 de 10») */
  detail?: string
}

export interface DuoRecord {
  ids: [string, string]
  names: [string, string]
  played: number
  won: number
  drawn: number
  lost: number
  winRate: number
}

export interface Records {
  biggestWin: MatchRecord | null
  mostGoals: MatchRecord | null
  bestStreak: PlayerRecord | null
  mostMvps: PlayerRecord | null
  mostPlayed: PlayerRecord | null
  bestWinRate: PlayerRecord | null
  bestDuo: DuoRecord | null
  worstDuo: DuoRecord | null
}

/** Partidos juntos mínimos para que una pareja cuente */
export const DUO_MIN_GAMES = 3
/** Partidos mínimos para el récord de % de victorias */
export const WIN_RATE_MIN_GAMES = 5

/** Máximo de una métrica entre jugadores; con empate salen todos */
function topPlayers(
  rows: { id: string; name: string; value: number; detail?: string }[],
  min = 1,
): PlayerRecord | null {
  const best = Math.max(...rows.map((r) => r.value), -Infinity)
  if (!Number.isFinite(best) || best < min) return null
  const top = rows.filter((r) => r.value === best).sort((a, b) => a.name.localeCompare(b.name))
  return {
    ids: top.map((r) => r.id),
    names: top.map((r) => r.name),
    value: best,
    detail: top.length === 1 ? top[0]!.detail : undefined,
  }
}

export function records(
  matches: Match[],
  players: Player[],
  mins: { winRate: number; duo: number } = { winRate: WIN_RATE_MIN_GAMES, duo: DUO_MIN_GAMES },
): Records {
  const played = matches.filter(isPlayed).sort(byDate)
  const names = new Map(players.map((p) => [p.id, p.name]))
  const nameOf = (mp: MatchPlayer) => names.get(mp.id) ?? mp.name

  // Partidos: el último gana en caso de empate (más fresco en la memoria)
  let biggestWin: MatchRecord | null = null
  let mostGoals: MatchRecord | null = null
  for (const m of played) {
    const margin = Math.abs(m.scoreA - m.scoreB)
    const goals = m.scoreA + m.scoreB
    if (margin > 0 && (!biggestWin || margin >= biggestWin.value)) biggestWin = { match: m, value: margin }
    if (goals > 0 && (!mostGoals || goals >= mostGoals.value)) mostGoals = { match: m, value: goals }
  }

  // Jugadores
  const ids = new Map<string, string>()
  for (const m of played) for (const mp of [...m.teamA, ...m.teamB]) ids.set(mp.id, nameOf(mp))
  const games = new Map<string, PlayerGame[]>([...ids.keys()].map((id) => [id, gamesOf(played, id)]))
  const rows = (value: (g: PlayerGame[]) => number, detail?: (g: PlayerGame[]) => string) =>
    [...games].map(([id, g]) => ({ id, name: ids.get(id)!, value: value(g), detail: detail?.(g) }))

  const streak = (g: PlayerGame[]) => {
    let best = 0
    let run = 0
    for (const x of g) {
      run = x.outcome === 'W' ? run + 1 : 0
      best = Math.max(best, run)
    }
    return best
  }
  const wins = (g: PlayerGame[]) => g.filter((x) => x.outcome === 'W').length

  // Parejas que jugaron juntas
  const duos = new Map<string, DuoRecord>()
  for (const m of played)
    for (const [team, side] of [
      [m.teamA, 'A'],
      [m.teamB, 'B'],
    ] as const) {
      const o = resultFor(m, side)
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) {
          const [x, y] = [team[i]!, team[j]!].sort((p, q) => p.id.localeCompare(q.id)) as [
            MatchPlayer,
            MatchPlayer,
          ]
          const key = pairKey(x.id, y.id)
          const d = duos.get(key) ?? {
            ids: [x.id, y.id] as [string, string],
            names: [nameOf(x), nameOf(y)] as [string, string],
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            winRate: 0,
          }
          d.played++
          if (o === 'W') d.won++
          else if (o === 'D') d.drawn++
          else d.lost++
          d.winRate = d.won / d.played
          duos.set(key, d)
        }
    }
  const eligible = [...duos.values()].filter((d) => d.played >= mins.duo)
  const bestDuo =
    eligible.filter((d) => d.won > 0).sort((a, b) => b.winRate - a.winRate || b.played - a.played)[0] ?? null
  const worstDuo =
    eligible
      .filter((d) => d.lost > 0 && d !== bestDuo)
      .sort((a, b) => a.winRate - b.winRate || b.played - a.played || b.lost - a.lost)[0] ?? null

  return {
    biggestWin,
    mostGoals,
    bestStreak: topPlayers(rows(streak), 2),
    mostMvps: topPlayers(rows((g) => g.filter((x) => x.mvp).length)),
    mostPlayed: topPlayers(rows((g) => g.length)),
    bestWinRate: topPlayers(
      rows(
        (g) => (g.length >= mins.winRate ? Math.round((wins(g) / g.length) * 100) : -1),
        (g) => `${wins(g)} de ${g.length}`,
      ),
      1,
    ),
    bestDuo,
    worstDuo,
  }
}

// ---------- Cara a cara entre dos jugadores ----------

export interface HeadToHead {
  together: { played: number; won: number; drawn: number; lost: number }
  /** Enfrentados: victorias de cada uno */
  against: { played: number; winsA: number; winsB: number; drawn: number }
  /** Del más reciente al más antiguo */
  games: { match: Played; together: boolean; outcome: Outcome }[]
}

/** Partidos de `a` y `b` juntos y enfrentados; `outcome` es siempre desde el punto de vista de `a` */
export function headToHead(matches: Match[], a: string, b: string): HeadToHead {
  const h: HeadToHead = {
    together: { played: 0, won: 0, drawn: 0, lost: 0 },
    against: { played: 0, winsA: 0, winsB: 0, drawn: 0 },
    games: [],
  }
  if (a === b) return h
  for (const g of gamesOf(matches, a)) {
    const together = g.mates.some((p) => p.id === b)
    if (!together && !g.rivals.some((p) => p.id === b)) continue
    if (together) {
      h.together.played++
      if (g.outcome === 'W') h.together.won++
      else if (g.outcome === 'D') h.together.drawn++
      else h.together.lost++
    } else {
      h.against.played++
      if (g.outcome === 'W') h.against.winsA++
      else if (g.outcome === 'D') h.against.drawn++
      else h.against.winsB++
    }
    h.games.push({ match: g.match as Played, together, outcome: g.outcome })
  }
  h.games.reverse()
  return h
}

// ---------- Evolución del jugador ----------

export interface TimelinePoint {
  date: string
  outcome: Outcome
  /** % de victorias acumulado tras este partido (0–1) */
  winRate: number
  /** Puntos por partido acumulados (victoria 1, empate 0,5) */
  score: number
}

export function timeline(games: PlayerGame[]): TimelinePoint[] {
  let won = 0
  let pts = 0
  return games.map((g, i) => {
    if (g.outcome === 'W') won++
    pts += points(g.outcome)
    return { date: g.match.date, outcome: g.outcome, winRate: won / (i + 1), score: pts / (i + 1) }
  })
}

/** Club con el que más gana (mín. 2 partidos); null si ninguno destaca */
export function talisman(games: PlayerGame[]): Match['clubA'] | null {
  const by = new Map<Match['clubA'], { played: number; won: number }>()
  for (const g of games) {
    const c = by.get(g.club) ?? { played: 0, won: 0 }
    c.played++
    if (g.outcome === 'W') c.won++
    by.set(g.club, c)
  }
  const ranked = [...by]
    .filter(([, c]) => c.played >= 2 && c.won > 0)
    .sort(([, x], [, y]) => y.won / y.played - x.won / x.played || y.played - x.played)
  if (ranked.length === 0) return null
  const [club, best] = ranked[0]!
  // Si otro club empata en % y partidos, no hay talismán claro
  const second = ranked[1]?.[1]
  if (second && second.won * best.played === best.won * second.played && second.played === best.played)
    return null
  // Tiene que ganar con él más que en general
  const overall = games.filter((g) => g.outcome === 'W').length / games.length
  return best.won / best.played > overall ? club : null
}

// ---------- Veredicto del sorteo ----------

export type Verdict = 'yes' | 'meh' | 'no'

/** ¿Funciona el sorteo? Sí con 55 % o más de partidos igualados; más o menos desde el 40 % */
export function verdict(q: DrawQuality): Verdict | null {
  if (q.played === 0) return null
  const close = q.close / q.played
  return close >= 0.55 ? 'yes' : close >= 0.4 ? 'meh' : 'no'
}

// ---------- Duelos entre jugadores ----------

/** Las parejas de jugadores que más veces se han enfrentado */
export function frequentDuels(matches: Match[], players: Player[], limit = 3): [string, string][] {
  const known = new Set(players.map((p) => p.id))
  const count = new Map<string, { ids: [string, string]; n: number }>()
  for (const m of matches.filter(isPlayed))
    for (const x of m.teamA)
      for (const y of m.teamB) {
        if (!known.has(x.id) || !known.has(y.id)) continue
        const ids = [x.id, y.id].sort() as [string, string]
        const key = pairKey(...ids)
        const c = count.get(key) ?? { ids, n: 0 }
        c.n++
        count.set(key, c)
      }
  return [...count.values()]
    .sort((a, b) => b.n - a.n || a.ids.join().localeCompare(b.ids.join()))
    .slice(0, limit)
    .map((c) => c.ids)
}
