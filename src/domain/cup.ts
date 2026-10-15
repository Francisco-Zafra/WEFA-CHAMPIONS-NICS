import { CLUBS } from './clubs'
import { shuffle, type Rng } from './rng'
import type { ClubId, Match, MatchPlayer } from './types'

/**
 * Copa eliminatoria de 8 clubes: 7 cruces.
 *   0–3 cuartos (seeds[0] vs seeds[1], seeds[2] vs seeds[3]…)
 *   4–5 semifinales (ganador 0 vs ganador 1, ganador 2 vs ganador 3)
 *   6   final
 */
export const TIE_COUNT = 7

export const ROUNDS = [
  { key: 'qf', name: 'Cuartos de final', short: 'Cuartos', ties: [0, 1, 2, 3] },
  { key: 'sf', name: 'Semifinales', short: 'Semis', ties: [4, 5] },
  { key: 'f', name: 'Final', short: 'Final', ties: [6] },
] as const

export interface CupTie {
  scoreA: number | null
  scoreB: number | null
  /** Quién pasa. Con empate lo elige el admin */
  winner: ClubId | null
  /** YYYY-MM-DD */
  date: string | null
  /** HH:MM */
  time: string | null
  place: string | null
  /** Equipos sorteados para este cruce (opcional) */
  teamA: MatchPlayer[]
  teamB: MatchPlayer[]
  captainA: string | null
  captainB: string | null
}

export interface Cup {
  id: string
  name: string
  createdAt: number
  /** Orden del cuadro: los cruces de cuartos son [0,1], [2,3], [4,5], [6,7] */
  seeds: ClubId[]
  ties: CupTie[]
}

export type CupInput = Omit<Cup, 'id' | 'createdAt'>

export const emptyTie = (): CupTie => ({
  scoreA: null,
  scoreB: null,
  winner: null,
  date: null,
  time: null,
  place: null,
  teamA: [],
  teamB: [],
  captainA: null,
  captainB: null,
})

export function newCup(name: string, rng: Rng): CupInput {
  return { name, seeds: drawSeeds(rng), ties: Array.from({ length: TIE_COUNT }, emptyTie) }
}

export function drawSeeds(rng: Rng): ClubId[] {
  return shuffle(
    CLUBS.map((c) => c.id),
    rng,
  )
}

export function roundOf(tie: number) {
  return ROUNDS.find((r) => (r.ties as readonly number[]).includes(tie))!
}

/** Nombre corto del cruce: «Cuartos 2», «Semis 1», «Final» */
export function tieLabel(tie: number): string {
  const round = roundOf(tie)
  if (round.ties.length === 1) return round.short
  return `${round.short} ${(round.ties as readonly number[]).indexOf(tie) + 1}`
}

/** Cruces de los que salen los dos participantes de `tie` (vacío en cuartos) */
export function feeders(tie: number): [number, number] | null {
  if (tie < 4) return null
  if (tie < 6) return [(tie - 4) * 2, (tie - 4) * 2 + 1]
  return [4, 5]
}

/** Cruce al que pasa el ganador de `tie` */
export function nextTie(tie: number): number | null {
  if (tie < 4) return 4 + Math.floor(tie / 2)
  if (tie < 6) return 6
  return null
}

export function participants(cup: Pick<Cup, 'seeds' | 'ties'>, tie: number): [ClubId | null, ClubId | null] {
  const from = feeders(tie)
  if (!from) return [cup.seeds[tie * 2] ?? null, cup.seeds[tie * 2 + 1] ?? null]
  return [cup.ties[from[0]]?.winner ?? null, cup.ties[from[1]]?.winner ?? null]
}

export const isReady = (cup: Pick<Cup, 'seeds' | 'ties'>, tie: number) =>
  participants(cup, tie).every((c) => c !== null)

export const isDecided = (t: CupTie | undefined) => !!t?.winner

export const champion = (cup: Pick<Cup, 'ties'>): ClubId | null => cup.ties[6]?.winner ?? null

export function runnerUp(cup: Pick<Cup, 'seeds' | 'ties'>): ClubId | null {
  const win = champion(cup)
  if (!win) return null
  return participants(cup, 6).find((c) => c !== win) ?? null
}

export type CupStatus = 'draft' | 'playing' | 'finished'

/** draft: aún sin resultados (el cuadro se puede volver a sortear) */
export function cupStatus(cup: Pick<Cup, 'ties'>): CupStatus {
  if (champion(cup)) return 'finished'
  return cup.ties.some(isDecided) ? 'playing' : 'draft'
}

export const playedTies = (cup: Pick<Cup, 'ties'>) => cup.ties.filter(isDecided).length

/** Siguiente cruce con participantes y sin resultado, en orden del cuadro */
export function nextPending(cup: Pick<Cup, 'seeds' | 'ties'>): number | null {
  for (let i = 0; i < TIE_COUNT; i++) if (isReady(cup, i) && !isDecided(cup.ties[i])) return i
  return null
}

export interface TieResult {
  scoreA: number
  scoreB: number
  /** Solo se tiene en cuenta si hay empate */
  winner?: ClubId | null
  date: string
}

export type ResultError = 'not-ready' | 'need-winner' | 'invalid-winner'

/**
 * Apunta el resultado de un cruce. Si cambia quién pasa, se borran los resultados
 * de las rondas siguientes que dependían de él (sus participantes ya no son los mismos).
 */
export function setResult(
  cup: Pick<Cup, 'seeds' | 'ties'>,
  tie: number,
  result: TieResult,
): { ok: true; ties: CupTie[] } | { ok: false; error: ResultError } {
  const [a, b] = participants(cup, tie)
  if (!a || !b) return { ok: false, error: 'not-ready' }
  let winner: ClubId
  if (result.scoreA !== result.scoreB) winner = result.scoreA > result.scoreB ? a : b
  else if (!result.winner) return { ok: false, error: 'need-winner' }
  else if (result.winner !== a && result.winner !== b) return { ok: false, error: 'invalid-winner' }
  else winner = result.winner

  const ties = cup.ties.map((t) => ({ ...t }))
  const previous = ties[tie]!.winner
  ties[tie] = { ...ties[tie]!, scoreA: result.scoreA, scoreB: result.scoreB, winner, date: result.date }
  if (previous && previous !== winner) resetDownstream(ties, tie)
  return { ok: true, ties }
}

/** Borra el resultado de un cruce (y lo que dependía de él) */
export function clearResult(cup: Pick<Cup, 'ties'>, tie: number): CupTie[] {
  const ties = cup.ties.map((t) => ({ ...t }))
  ties[tie] = { ...ties[tie]!, scoreA: null, scoreB: null, winner: null }
  resetDownstream(ties, tie)
  return ties
}

function resetDownstream(ties: CupTie[], tie: number) {
  for (let next = nextTie(tie); next !== null; next = nextTie(next)) {
    // Los participantes cambian: el sorteo de equipos de ese cruce tampoco vale
    ties[next] = emptyTie()
  }
}

/** Da la vuelta a un cruce: el equipo A pasa a ser el B (resultado, equipos y capitanes) */
const flipTie = (t: CupTie): CupTie => ({
  ...t,
  scoreA: t.scoreB,
  scoreB: t.scoreA,
  teamA: t.teamB,
  teamB: t.teamA,
  captainA: t.captainB,
  captainB: t.captainA,
})

export interface Reseed {
  ties: CupTie[]
  /** Cruces jugados cuyo resultado se pierde */
  lostResults: number
  /** Cruces sin jugar cuyos equipos sorteados se pierden */
  lostTeams: number
}

/**
 * Rehace el cuadro con otro orden de clubes. Cada cruce conserva su resultado y sus equipos si
 * sigue enfrentando a los mismos dos clubes en la misma ronda (dándoles la vuelta si cambian de
 * lado), con su fecha incluida; si no, se vacía, y con él lo que dependía de su ganador.
 */
export function reseed(cup: Pick<Cup, 'seeds' | 'ties'>, seeds: ClubId[]): Reseed {
  const ties: CupTie[] = []
  const next = { seeds, ties }
  const used = new Set<number>()
  for (let i = 0; i < TIE_COUNT; i++) {
    const [a, b] = participants(next, i)
    let tie = emptyTie()
    if (a && b)
      for (const j of roundOf(i).ties) {
        const [oa, ob] = participants(cup, j)
        const same = oa === a && ob === b
        if (!same && !(oa === b && ob === a)) continue
        tie = same ? { ...cup.ties[j]! } : flipTie(cup.ties[j]!)
        used.add(j)
        break
      }
    ties.push(tie)
  }
  let lostResults = 0
  let lostTeams = 0
  cup.ties.forEach((t, i) => {
    if (used.has(i)) return
    if (t.winner) lostResults++
    else if (t.teamA.length > 0) lostTeams++
  })
  return { ties, lostResults, lostTeams }
}

/**
 * Cruces jugados de todas las copas convertidos en partidos, para contarlos en estadísticas,
 * fichas y duelos junto a los amistosos (los cruces sin equipos guardados solo cuentan para clubes)
 */
export function cupMatches(cups: Cup[]): Match[] {
  const out: Match[] = []
  for (const cup of cups)
    cup.ties.forEach((t, i) => {
      if (!t.winner || t.scoreA === null || t.scoreB === null) return
      const [a, b] = participants(cup, i)
      if (!a || !b) return
      out.push({
        id: `${cup.id}:${i}`,
        date: t.date ?? '',
        time: t.time,
        place: t.place,
        createdAt: cup.createdAt + i,
        clubA: a,
        clubB: b,
        captainA: t.captainA,
        captainB: t.captainB,
        teamA: t.teamA,
        teamB: t.teamB,
        scoreA: t.scoreA,
        scoreB: t.scoreB,
        mvp: null,
        winner: t.winner,
        cup: { id: cup.id, name: cup.name, label: tieLabel(i) },
      })
    })
  return out
}

/** Títulos por club en las copas terminadas */
export function titles(cups: Cup[]): Map<ClubId, number> {
  const out = new Map<ClubId, number>()
  for (const c of cups) {
    const win = champion(c)
    if (win) out.set(win, (out.get(win) ?? 0) + 1)
  }
  return out
}
