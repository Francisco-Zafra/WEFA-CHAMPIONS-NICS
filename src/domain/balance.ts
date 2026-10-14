import { averageStats } from './rating'
import { createRng, shuffle, type Rng } from './rng'
import { STAT_KEYS, type Player, type Stats } from './types'

export type PlayerPair = readonly [string, string]

export interface BalanceOptions {
  players: Player[]
  /** Tamaño del equipo A; el B se queda con el resto */
  sizeA: number
  captainA?: string | null
  captainB?: string | null
  /** Parejas que deben caer en el mismo equipo */
  together?: PlayerPair[]
  /** Parejas que deben caer en equipos distintos */
  apart?: PlayerPair[]
  /** Diferencia máxima de media entre equipos */
  tolerance: number
  seed: number
}

export interface TeamSummary {
  players: Player[]
  rating: number
  stats: Stats
}

export interface BalanceResult {
  teamA: TeamSummary
  teamB: TeamSummary
  /** |media A − media B| */
  ratingDiff: number
  /** Diferencia media por stat entre ambos equipos */
  statDiff: number
  /** false si ninguna combinación cumple la tolerancia y se devuelve la mejor posible */
  withinTolerance: boolean
  /** Combinaciones válidas encontradas */
  candidates: number
  method: 'exhaustive' | 'search'
}

export type BalanceError = 'not-enough-players' | 'invalid-size' | 'impossible-constraints'

export type BalanceOutcome = { ok: true; result: BalanceResult } | { ok: false; error: BalanceError }

/** Por debajo de este nº de combinaciones se exploran todas */
const EXHAUSTIVE_LIMIT = 60_000
const SEARCH_RESTARTS = 250
/** Peso de la diferencia por stat frente a la diferencia de media */
const STAT_WEIGHT = 0.15
/** Se elige al azar entre las mejores N combinaciones válidas */
const VARIETY_POOL = 40
const VIOLATION_PENALTY = 1000
const EPS = 1e-9

interface Problem {
  n: number
  sizeA: number
  ratings: number[]
  stats: number[][]
  /** índice → 1 (A) / 0 (B) para capitanes */
  fixed: Map<number, 0 | 1>
  together: [number, number][]
  apart: [number, number][]
}

interface Candidate {
  key: string
  side: Uint8Array
  ratingDiff: number
  statDiff: number
  score: number
}

export function balanceTeams(opts: BalanceOptions): BalanceOutcome {
  const { players } = opts
  const n = players.length
  if (n < 2) return { ok: false, error: 'not-enough-players' }
  if (opts.sizeA < 1 || opts.sizeA > n - 1) return { ok: false, error: 'invalid-size' }

  const index = new Map(players.map((p, i) => [p.id, i]))
  const toPairs = (pairs: PlayerPair[] = []) =>
    pairs
      .map(([a, b]) => [index.get(a), index.get(b)] as const)
      .filter((p): p is [number, number] => p[0] !== undefined && p[1] !== undefined && p[0] !== p[1])

  const fixed = new Map<number, 0 | 1>()
  const capA = opts.captainA ? index.get(opts.captainA) : undefined
  const capB = opts.captainB ? index.get(opts.captainB) : undefined
  if (capA !== undefined) fixed.set(capA, 1)
  if (capB !== undefined) {
    if (fixed.get(capB) === 1) return { ok: false, error: 'impossible-constraints' }
    fixed.set(capB, 0)
  }

  const problem: Problem = {
    n,
    sizeA: opts.sizeA,
    ratings: players.map((p) => p.rating),
    stats: players.map((p) => STAT_KEYS.map((k) => p.stats[k])),
    fixed,
    together: toPairs(opts.together),
    apart: toPairs(opts.apart),
  }

  if (!isSatisfiable(problem)) return { ok: false, error: 'impossible-constraints' }

  const rng = createRng(opts.seed)
  const exhaustive = binomial(n, opts.sizeA) <= EXHAUSTIVE_LIMIT
  const found = exhaustive ? enumerateAll(problem) : localSearch(problem, rng)
  if (found.length === 0) return { ok: false, error: 'impossible-constraints' }

  found.sort((a, b) => a.score - b.score)
  const within = found.filter((c) => c.ratingDiff <= opts.tolerance + EPS)
  const pool = within.length > 0 ? within.slice(0, VARIETY_POOL) : found.slice(0, 1)
  const chosen = pool[Math.floor(rng() * pool.length)]!

  const teamA = players.filter((_, i) => chosen.side[i] === 1)
  const teamB = players.filter((_, i) => chosen.side[i] === 0)
  return {
    ok: true,
    result: {
      teamA: summarize(teamA),
      teamB: summarize(teamB),
      ratingDiff: chosen.ratingDiff,
      statDiff: chosen.statDiff,
      withinTolerance: within.length > 0,
      candidates: within.length,
      method: exhaustive ? 'exhaustive' : 'search',
    },
  }
}

function summarize(players: Player[]): TeamSummary {
  const sorted = [...players].sort((a, b) => b.rating - a.rating)
  const rating = sorted.reduce((acc, p) => acc + p.rating, 0) / (sorted.length || 1)
  return { players: sorted, rating, stats: averageStats(sorted) }
}

/**
 * Recalcula un reparto tras retocarlo a mano: medias, stats, diferencias y si cumple la
 * tolerancia. Conserva cómo se obtuvo el original (método y candidatos).
 */
export function rebalance(
  teamA: Player[],
  teamB: Player[],
  tolerance: number,
  previous: Pick<BalanceResult, 'candidates' | 'method'>,
): BalanceResult {
  const a = summarize(teamA)
  const b = summarize(teamB)
  const statDiff = STAT_KEYS.reduce((acc, k) => acc + Math.abs(a.stats[k] - b.stats[k]), 0) / STAT_KEYS.length
  const ratingDiff = Math.abs(a.rating - b.rating)
  return {
    teamA: a,
    teamB: b,
    ratingDiff,
    statDiff,
    withinTolerance: ratingDiff <= tolerance + EPS,
    candidates: previous.candidates,
    method: previous.method,
  }
}

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

/**
 * Comprueba con union-find con paridad que capitanes + juntos + separados
 * no se contradicen (p.ej. A junto a B, B junto a C, A separado de C).
 */
function isSatisfiable(p: Problem): boolean {
  const parent = Array.from({ length: p.n + 1 }, (_, i) => i)
  const parity = new Array<number>(p.n + 1).fill(0)
  const find = (x: number): [number, number] => {
    let par = 0
    let root = x
    while (parent[root] !== root) {
      par ^= parity[root]!
      root = parent[root]!
    }
    return [root, par]
  }
  const union = (a: number, b: number, diff: number) => {
    const [ra, pa] = find(a)
    const [rb, pb] = find(b)
    if (ra === rb) return (pa ^ pb) === diff
    parent[ra] = rb
    parity[ra] = pa ^ pb ^ diff
    return true
  }
  // Nodo virtual p.n = "equipo A"
  for (const [i, side] of p.fixed) if (!union(i, p.n, side === 1 ? 0 : 1)) return false
  for (const [a, b] of p.together) if (!union(a, b, 0)) return false
  for (const [a, b] of p.apart) if (!union(a, b, 1)) return false
  return true
}

function violations(p: Problem, side: Uint8Array): number {
  let v = 0
  for (const [i, s] of p.fixed) if (side[i] !== s) v++
  for (const [a, b] of p.together) if (side[a] !== side[b]) v++
  for (const [a, b] of p.apart) if (side[a] === side[b]) v++
  return v
}

function evaluate(p: Problem, side: Uint8Array): Omit<Candidate, 'key' | 'side'> {
  const sizeB = p.n - p.sizeA
  let ra = 0
  let rb = 0
  const sa = new Array<number>(STAT_KEYS.length).fill(0)
  const sb = new Array<number>(STAT_KEYS.length).fill(0)
  for (let i = 0; i < p.n; i++) {
    const st = p.stats[i]!
    if (side[i] === 1) {
      ra += p.ratings[i]!
      for (let k = 0; k < st.length; k++) sa[k]! += st[k]!
    } else {
      rb += p.ratings[i]!
      for (let k = 0; k < st.length; k++) sb[k]! += st[k]!
    }
  }
  const ratingDiff = Math.abs(ra / p.sizeA - rb / sizeB)
  let statDiff = 0
  for (let k = 0; k < STAT_KEYS.length; k++) statDiff += Math.abs(sa[k]! / p.sizeA - sb[k]! / sizeB)
  statDiff /= STAT_KEYS.length
  return { ratingDiff, statDiff, score: ratingDiff + STAT_WEIGHT * statDiff }
}

function keyOf(side: Uint8Array): string {
  return side.join('')
}

function enumerateAll(p: Problem): Candidate[] {
  const out: Candidate[] = []
  const side = new Uint8Array(p.n)
  const visit = (start: number, left: number) => {
    if (left === 0) {
      if (violations(p, side) === 0) {
        out.push({ key: keyOf(side), side: side.slice(), ...evaluate(p, side) })
      }
      return
    }
    for (let i = start; i <= p.n - left; i++) {
      side[i] = 1
      visit(i + 1, left - 1)
      side[i] = 0
    }
  }
  visit(0, p.sizeA)
  return out
}

/** Reparto inicial: grupos "juntos" enteros, capitanes en su lado, resto al azar */
function initialAssignment(p: Problem, rng: Rng): Uint8Array {
  const groupOf = Array.from({ length: p.n }, (_, i) => i)
  const find = (x: number): number => (groupOf[x] === x ? x : (groupOf[x] = find(groupOf[x]!)))
  for (const [a, b] of p.together) groupOf[find(a)] = find(b)
  const groups = new Map<number, number[]>()
  for (let i = 0; i < p.n; i++) {
    const g = find(i)
    groups.set(g, [...(groups.get(g) ?? []), i])
  }

  const ordered = shuffle([...groups.values()], rng).sort((a, b) => {
    const fa = a.some((i) => p.fixed.has(i)) ? 0 : 1
    const fb = b.some((i) => p.fixed.has(i)) ? 0 : 1
    return fa - fb
  })

  const side = new Uint8Array(p.n)
  let leftA = p.sizeA
  let leftB = p.n - p.sizeA
  for (const g of ordered) {
    const fixedSide = g.map((i) => p.fixed.get(i)).find((s) => s !== undefined)
    let target: 0 | 1
    if (fixedSide !== undefined) target = fixedSide
    else if (g.length <= leftA && g.length <= leftB) target = rng() < leftA / (leftA + leftB) ? 1 : 0
    else target = g.length <= leftA ? 1 : 0
    for (const i of g) {
      // Si el grupo no cabe entero, el resto se desborda al otro lado
      const s = target === 1 ? (leftA > 0 ? 1 : 0) : leftB > 0 ? 0 : 1
      side[i] = s
      if (s === 1) leftA--
      else leftB--
    }
  }
  return side
}

function localSearch(p: Problem, rng: Rng): Candidate[] {
  const seen = new Map<string, Candidate>()
  const cost = (side: Uint8Array) => evaluate(p, side).score + VIOLATION_PENALTY * violations(p, side)

  for (let r = 0; r < SEARCH_RESTARTS; r++) {
    const side = initialAssignment(p, rng)
    let current = cost(side)
    for (;;) {
      let best = current
      let bestSwap: [number, number] | null = null
      for (let i = 0; i < p.n; i++) {
        if (side[i] !== 1) continue
        for (let j = 0; j < p.n; j++) {
          if (side[j] !== 0) continue
          side[i] = 0
          side[j] = 1
          const c = cost(side)
          side[i] = 1
          side[j] = 0
          if (c < best - EPS) {
            best = c
            bestSwap = [i, j]
          }
        }
      }
      if (!bestSwap) break
      side[bestSwap[0]] = 0
      side[bestSwap[1]] = 1
      current = best
    }
    if (violations(p, side) > 0) continue
    const key = keyOf(side)
    if (!seen.has(key)) seen.set(key, { key, side: side.slice(), ...evaluate(p, side) })
  }
  return [...seen.values()]
}
