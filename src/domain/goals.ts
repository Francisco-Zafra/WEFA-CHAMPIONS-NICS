import { isPlayed } from './standings'
import type { ClubId, Match, MatchGoals, MatchPlayer } from './types'
import { pairKey } from './variety'

type Side = 'A' | 'B'

export const emptyGoals = (): MatchGoals => ({ byPlayer: {}, ownA: 0, ownB: 0 })

const teamOf = (m: Pick<Match, 'teamA' | 'teamB'>, side: Side) => (side === 'A' ? m.teamA : m.teamB)
const scoreOf = (m: Pick<Match, 'scoreA' | 'scoreB'>, side: Side) => (side === 'A' ? m.scoreA : m.scoreB)
const ownOf = (g: MatchGoals, side: Side) => (side === 'A' ? g.ownA : g.ownB)

/** Goles apuntados a un lado: los de sus jugadores más los que le metió el rival en propia puerta */
export function recordedFor(m: Pick<Match, 'teamA' | 'teamB'>, g: MatchGoals, side: Side): number {
  return teamOf(m, side).reduce((a, p) => a + (g.byPlayer[p.id] ?? 0), 0) + ownOf(g, side)
}

export interface SideTally {
  /** Goles del marcador */
  score: number
  /** Goles con goleador apuntado */
  recorded: number
  /** score − recorded: > 0 faltan, < 0 sobran */
  missing: number
}

export interface GoalTally {
  A: SideTally
  B: SideTally
  /** Todo cuadra con el marcador */
  ok: boolean
}

export function tallyGoals(
  m: Pick<Match, 'teamA' | 'teamB' | 'scoreA' | 'scoreB'>,
  g: MatchGoals,
): GoalTally {
  const side = (s: Side): SideTally => {
    const score = scoreOf(m, s) ?? 0
    const recorded = recordedFor(m, g, s)
    return { score, recorded, missing: score - recorded }
  }
  const A = side('A')
  const B = side('B')
  return { A, B, ok: A.missing === 0 && B.missing === 0 }
}

/** «Faltan 2 goles por apuntar en Pandas» / «Sobra 1 gol en Jabalíes: su marcador es 2» */
export function tallyWarning(t: SideTally, team: string): string | null {
  if (t.missing > 0) return `Faltan ${t.missing} ${t.missing === 1 ? 'gol' : 'goles'} por apuntar en ${team}`
  if (t.missing < 0) {
    const extra = -t.missing
    return `${extra === 1 ? 'Sobra 1 gol' : `Sobran ${extra} goles`} en ${team}: su marcador es ${t.score}`
  }
  return null
}

const totalRecorded = (m: Match, g: MatchGoals) => recordedFor(m, g, 'A') + recordedFor(m, g, 'B')

/**
 * El partido tiene goleadores apuntados (aunque falte alguno). Un 0–0 guardado cuenta: no había
 * nada que apuntar
 */
export function hasScorers(m: Match): m is Match & { goals: MatchGoals; scoreA: number; scoreB: number } {
  if (!m.goals || !isPlayed(m)) return false
  return totalRecorded(m, m.goals) > 0 || m.scoreA + m.scoreB === 0
}

export interface Scorer {
  /** null = gol en propia puerta (de un rival) */
  id: string | null
  name: string
  goals: number
}

/** Goleadores de cada lado, de más a menos goles; los de propia puerta, al final */
export function scorersBySide(m: Match, names: Map<string, string> = new Map()): Record<Side, Scorer[]> {
  const g = m.goals ?? emptyGoals()
  const list = (side: Side): Scorer[] => {
    const out = teamOf(m, side)
      .filter((p) => (g.byPlayer[p.id] ?? 0) > 0)
      .map((p) => ({ id: p.id, name: names.get(p.id) ?? p.name, goals: g.byPlayer[p.id]! }))
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, 'es'))
    const own = ownOf(g, side)
    return own > 0 ? [...out, { id: null, name: 'En propia puerta', goals: own }] : out
  }
  return { A: list('A'), B: list('B') }
}

/** Distintivo para los goles de un jugador en un partido */
export function feat(goals: number): string | null {
  if (goals >= 5) return 'MANITA'
  if (goals === 4) return 'PÓKER'
  if (goals === 3) return 'HAT-TRICK'
  if (goals === 2) return 'DOBLETE'
  return null
}

/** Pista para la lista del historial: «Riccardo ×3», «Sergio, Fran» o null si no hay goleadores */
export function topScorerLabel(m: Match, names: Map<string, string> = new Map()): string | null {
  if (!hasScorers(m)) return null
  const all = [...scorersBySide(m, names).A, ...scorersBySide(m, names).B].filter((s) => s.id)
  if (all.length === 0) return null
  const best = Math.max(...all.map((s) => s.goals))
  const top = all.filter((s) => s.goals === best).map((s) => s.name)
  const who = top.length > 2 ? `${top.slice(0, 2).join(', ')} y ${top.length - 2} más` : top.join(', ')
  return best > 1 ? `${who} ×${best}` : who
}

// ---------- Estadísticas ----------

const chronological = (matches: Match[]) =>
  matches.filter(hasScorers).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)

export interface GoalSummary {
  /** Partidos con goleadores apuntados */
  matches: number
  /** Goles con goleador (sin contar los de propia puerta) */
  goals: number
  /** Goles en propia puerta */
  own: number
}

export function goalSummary(matches: Match[]): GoalSummary {
  const ms = chronological(matches)
  let goals = 0
  let own = 0
  for (const m of ms) {
    for (const p of [...m.teamA, ...m.teamB]) goals += m.goals.byPlayer[p.id] ?? 0
    own += m.goals.ownA + m.goals.ownB
  }
  return { matches: ms.length, goals, own }
}

export interface ScorerRow {
  id: string
  name: string
  goals: number
  /** Partidos en los que marcó */
  withGoal: number
  /** Partidos con goleadores apuntados en los que jugó */
  played: number
  /** Goles por partido (sobre `played`) */
  perMatch: number
  /** Su partido con más goles (el más reciente si empata) */
  best: { goals: number; match: Match } | null
  /** Partidos con 3 o más goles */
  hatTricks: number
  /** Mejor racha de partidos seguidos marcando */
  streak: number
}

/** Tabla de goleadores de todos los que jugaron partidos con goleadores, de más a menos goles */
export function scorerTable(matches: Match[], names: Map<string, string> = new Map()): ScorerRow[] {
  const rows = new Map<string, ScorerRow & { run: number }>()
  for (const m of chronological(matches))
    for (const p of [...m.teamA, ...m.teamB]) {
      const r = rows.get(p.id) ?? {
        id: p.id,
        name: names.get(p.id) ?? p.name,
        goals: 0,
        withGoal: 0,
        played: 0,
        perMatch: 0,
        best: null,
        hatTricks: 0,
        streak: 0,
        run: 0,
      }
      const n = m.goals.byPlayer[p.id] ?? 0
      r.played++
      r.goals += n
      if (n > 0) {
        r.withGoal++
        r.run++
        r.streak = Math.max(r.streak, r.run)
        if (!r.best || n >= r.best.goals) r.best = { goals: n, match: m }
        if (n >= 3) r.hatTricks++
      } else r.run = 0
      rows.set(p.id, r)
    }
  return [...rows.values()]
    .map((r) => {
      const { run, ...row } = r
      void run
      return { ...row, perMatch: r.played ? r.goals / r.played : 0 }
    })
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        b.perMatch - a.perMatch ||
        b.withGoal - a.withGoal ||
        a.name.localeCompare(b.name, 'es'),
    )
}

export interface ClubScorer {
  club: ClubId
  ids: string[]
  names: string[]
  goals: number
}

/** Máximo goleador con cada club (goles marcados jugando con él); con empate salen todos */
export function topScorerByClub(matches: Match[], names: Map<string, string> = new Map()): ClubScorer[] {
  const by = new Map<ClubId, Map<string, { name: string; goals: number }>>()
  for (const m of chronological(matches))
    for (const [team, club] of [
      [m.teamA, m.clubA],
      [m.teamB, m.clubB],
    ] as const) {
      const map = by.get(club) ?? new Map()
      for (const p of team) {
        const n = m.goals.byPlayer[p.id] ?? 0
        if (!n) continue
        const r = map.get(p.id) ?? { name: names.get(p.id) ?? p.name, goals: 0 }
        r.goals += n
        map.set(p.id, r)
      }
      by.set(club, map)
    }
  const out: ClubScorer[] = []
  for (const [club, map] of by) {
    const best = Math.max(0, ...[...map.values()].map((r) => r.goals))
    if (!best) continue
    const top = [...map]
      .filter(([, r]) => r.goals === best)
      .sort(([, x], [, y]) => x.name.localeCompare(y.name, 'es'))
    out.push({ club, ids: top.map(([id]) => id), names: top.map(([, r]) => r.name), goals: best })
  }
  return out.sort((a, b) => b.goals - a.goals || a.club.localeCompare(b.club))
}

/** Goles de cada partido con goleadores, del más antiguo al más reciente */
export function goalsPerMatch(matches: Match[]): { match: Match; goals: number }[] {
  return chronological(matches).map((m) => ({ match: m, goals: m.scoreA + m.scoreB }))
}

export interface GoalPlayerRecord {
  ids: string[]
  names: string[]
  value: number
  /** Partido del récord (si es de un partido y lo tiene uno solo) */
  match?: Match
}

export interface GoalDuoRecord {
  ids: [string, string]
  names: [string, string]
  goals: number
  played: number
}

export interface GoalRecords {
  mostInMatch: GoalPlayerRecord | null
  mostHatTricks: GoalPlayerRecord | null
  scoringStreak: GoalPlayerRecord | null
  bestDuo: GoalDuoRecord | null
}

function top(rows: { id: string; name: string; value: number; match?: Match }[], min = 1) {
  const best = Math.max(-Infinity, ...rows.map((r) => r.value))
  if (!Number.isFinite(best) || best < min) return null
  const winners = rows.filter((r) => r.value === best).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return {
    ids: winners.map((r) => r.id),
    names: winners.map((r) => r.name),
    value: best,
    match: winners.length === 1 ? winners[0]!.match : undefined,
  }
}

/** Récords de goles; `duoMin` = partidos juntos mínimos para la pareja goleadora */
export function goalRecords(
  matches: Match[],
  names: Map<string, string> = new Map(),
  duoMin = 3,
): GoalRecords {
  const table = scorerTable(matches, names)
  const nameOf = (p: MatchPlayer) => names.get(p.id) ?? p.name
  const duos = new Map<string, GoalDuoRecord>()
  for (const m of chronological(matches))
    for (const team of [m.teamA, m.teamB])
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) {
          const [x, y] = [team[i]!, team[j]!].sort((p, q) => p.id.localeCompare(q.id))
          const key = pairKey(x!.id, y!.id)
          const d = duos.get(key) ?? {
            ids: [x!.id, y!.id] as [string, string],
            names: [nameOf(x!), nameOf(y!)] as [string, string],
            goals: 0,
            played: 0,
          }
          d.played++
          d.goals += (m.goals.byPlayer[x!.id] ?? 0) + (m.goals.byPlayer[y!.id] ?? 0)
          duos.set(key, d)
        }
  const bestDuo =
    [...duos.values()]
      .filter((d) => d.played >= duoMin && d.goals > 0)
      .sort((a, b) => b.goals - a.goals || a.played - b.played)[0] ?? null
  return {
    mostInMatch: top(
      table.map((r) => ({ id: r.id, name: r.name, value: r.best?.goals ?? 0, match: r.best?.match })),
    ),
    mostHatTricks: top(table.map((r) => ({ id: r.id, name: r.name, value: r.hatTricks }))),
    scoringStreak: top(
      table.map((r) => ({ id: r.id, name: r.name, value: r.streak })),
      2,
    ),
    bestDuo,
  }
}
