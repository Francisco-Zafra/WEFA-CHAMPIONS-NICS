import { describe, expect, it } from 'vitest'
import { balanceTeams, binomial, rebalance, type BalanceOptions } from './balance'
import { pairKey } from './variety'
import { SEED_PLAYERS } from './fixtures'
import type { Player } from './types'

/** 12 jugadores fijos para pruebas deterministas del algoritmo de reparto */
const active: Player[] = [
  {
    id: 'legacy-2',
    name: "Guti's Boyfriend",
    rating: 83,
    stats: { rit: 83, tir: 83, pas: 83, reg: 83, def: 83, fis: 83 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-3',
    name: 'Ignacio A',
    rating: 82,
    stats: { rit: 82, tir: 82, pas: 82, reg: 82, def: 82, fis: 82 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-4',
    name: 'Ignacio P',
    rating: 87,
    stats: { rit: 87, tir: 87, pas: 87, reg: 87, def: 87, fis: 87 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-5',
    name: 'Jacobo',
    rating: 83,
    stats: { rit: 83, tir: 83, pas: 83, reg: 83, def: 83, fis: 83 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-6',
    name: 'Pablo',
    rating: 79,
    stats: { rit: 79, tir: 79, pas: 79, reg: 79, def: 79, fis: 79 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-7',
    name: 'Riccardo',
    rating: 95,
    stats: { rit: 95, tir: 95, pas: 95, reg: 95, def: 95, fis: 95 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-8',
    name: "Riccardo's Boyfriend",
    rating: 91,
    stats: { rit: 91, tir: 91, pas: 91, reg: 91, def: 91, fis: 91 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-9',
    name: 'Sergio',
    rating: 91,
    stats: { rit: 91, tir: 91, pas: 91, reg: 91, def: 91, fis: 91 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-10',
    name: 'Younes',
    rating: 76,
    stats: { rit: 76, tir: 76, pas: 76, reg: 76, def: 76, fis: 76 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-11',
    name: 'Álvaro',
    rating: 81,
    stats: { rit: 81, tir: 81, pas: 81, reg: 81, def: 81, fis: 81 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-16',
    name: 'Fran',
    rating: 89,
    stats: { rit: 89, tir: 92, pas: 89, reg: 92, def: 89, fis: 83 },
    avatar: null,
    active: true,
  },
  {
    id: 'legacy-17',
    name: 'Guti',
    rating: 94,
    stats: { rit: 94, tir: 94, pas: 94, reg: 94, def: 94, fis: 94 },
    avatar: null,
    active: true,
  },
]
const ids = (players: { id: string }[]) => players.map((p) => p.id).sort()

function run(opts: Partial<BalanceOptions> & { players: BalanceOptions['players'] }) {
  const outcome = balanceTeams({
    sizeA: Math.ceil(opts.players.length / 2),
    tolerance: 1,
    seed: 42,
    ...opts,
  })
  if (!outcome.ok) throw new Error(outcome.error)
  return outcome.result
}

describe('balanceTeams', () => {
  it('reparte a todos los jugadores sin repetir', () => {
    const r = run({ players: active })
    expect(r.teamA.players).toHaveLength(6)
    expect(r.teamB.players).toHaveLength(6)
    expect(ids([...r.teamA.players, ...r.teamB.players])).toEqual(ids(active))
    expect(r.method).toBe('exhaustive')
  })

  it('respeta el tamaño pedido con número impar', () => {
    const r = run({ players: active.slice(0, 11), sizeA: 5 })
    expect(r.teamA.players).toHaveLength(5)
    expect(r.teamB.players).toHaveLength(6)
  })

  it('cumple la tolerancia y la diferencia reportada es real', () => {
    const r = run({ players: active, tolerance: 0.5 })
    expect(r.withinTolerance).toBe(true)
    expect(r.ratingDiff).toBeLessThanOrEqual(0.5)
    const avg = (ps: typeof active) => ps.reduce((a, p) => a + p.rating, 0) / ps.length
    expect(Math.abs(avg(r.teamA.players) - avg(r.teamB.players))).toBeCloseTo(r.ratingDiff, 6)
  })

  it('es determinista con la misma semilla y varía con otra', () => {
    const a = run({ players: active, seed: 1 })
    const b = run({ players: active, seed: 1 })
    expect(ids(a.teamA.players)).toEqual(ids(b.teamA.players))
    const variants = new Set(
      Array.from({ length: 10 }, (_, s) => ids(run({ players: active, seed: s }).teamA.players).join()),
    )
    expect(variants.size).toBeGreaterThan(1)
  })

  it('si nada cumple la tolerancia devuelve la mejor opción', () => {
    const players = active.slice(0, 3)
    const r = run({ players, sizeA: 1, tolerance: 0 })
    expect(r.withinTolerance).toBe(false)
    expect(r.candidates).toBe(0)
    expect(r.teamA.players.length + r.teamB.players.length).toBe(3)
  })

  it.each(['exhaustive', 'search'] as const)('respeta capitanes y reglas (%s)', (mode) => {
    const players = mode === 'exhaustive' ? active : SEED_PLAYERS
    const [c1, c2, x, y, z, w] = players
    const r = run({
      players,
      captainA: c1!.id,
      captainB: c2!.id,
      together: [[x!.id, y!.id]],
      apart: [
        [z!.id, w!.id],
        [x!.id, c2!.id],
      ],
    })
    expect(r.method).toBe(mode)
    const inA = new Set(r.teamA.players.map((p) => p.id))
    expect(inA.has(c1!.id)).toBe(true)
    expect(inA.has(c2!.id)).toBe(false)
    expect(inA.has(x!.id)).toBe(inA.has(y!.id))
    expect(inA.has(z!.id)).not.toBe(inA.has(w!.id))
    expect(inA.has(x!.id)).toBe(true)
  })

  it('detecta reglas contradictorias', () => {
    const [a, b, c] = active
    const outcome = balanceTeams({
      players: active,
      sizeA: 6,
      tolerance: 1,
      seed: 1,
      together: [
        [a!.id, b!.id],
        [b!.id, c!.id],
      ],
      apart: [[a!.id, c!.id]],
    })
    expect(outcome).toEqual({ ok: false, error: 'impossible-constraints' })
  })

  it('detecta el mismo capitán en los dos equipos', () => {
    const outcome = balanceTeams({
      players: active,
      sizeA: 6,
      tolerance: 1,
      seed: 1,
      captainA: active[0]!.id,
      captainB: active[0]!.id,
    })
    expect(outcome.ok).toBe(false)
  })

  it('rechaza menos de 2 jugadores o tamaños inválidos', () => {
    expect(balanceTeams({ players: active.slice(0, 1), sizeA: 1, tolerance: 1, seed: 1 })).toEqual({
      ok: false,
      error: 'not-enough-players',
    })
    expect(balanceTeams({ players: active, sizeA: 12, tolerance: 1, seed: 1 })).toEqual({
      ok: false,
      error: 'invalid-size',
    })
  })

  it('con muchos jugadores la búsqueda es rápida y equilibrada', () => {
    const start = performance.now()
    const r = run({ players: SEED_PLAYERS, tolerance: 0.3 })
    expect(performance.now() - start).toBeLessThan(3000)
    expect(r.method).toBe('search')
    expect(r.withinTolerance).toBe(true)
    expect(r.ratingDiff).toBeLessThanOrEqual(0.3)
  })
})

describe('binomial', () => {
  it('calcula combinaciones', () => {
    expect(binomial(12, 6)).toBe(924)
    expect(binomial(27, 14)).toBe(20058300)
    expect(binomial(5, 7)).toBe(0)
  })
})

describe('rebalance', () => {
  it('recalcula medias y tolerancia tras un cambio manual', () => {
    const r = run({ players: active, tolerance: 1 })
    const [x] = r.teamA.players
    const [y] = r.teamB.players
    const a = [y!, ...r.teamA.players.slice(1)]
    const b = [x!, ...r.teamB.players.slice(1)]
    const edited = rebalance(a, b, 1, r)
    const avg = (ps: typeof active) => ps.reduce((acc, p) => acc + p.rating, 0) / ps.length
    expect(edited.teamA.rating).toBeCloseTo(avg(a), 6)
    expect(edited.ratingDiff).toBeCloseTo(Math.abs(avg(a) - avg(b)), 6)
    expect(edited.withinTolerance).toBe(edited.ratingDiff <= 1)
    expect(edited.method).toBe(r.method)
    expect(ids(edited.teamA.players)).toEqual(ids(a))
  })
})

describe('variedad', () => {
  const teamsOf = (r: ReturnType<typeof run>) => [
    r.teamA.players.map((p) => p.id),
    r.teamB.players.map((p) => p.id),
  ]
  /** Historial: el reparto de `base` repetido como última alineación */
  const historyOf = (teams: string[][]) => {
    const h = new Map<string, number>()
    for (const t of teams)
      for (let i = 0; i < t.length; i++)
        for (let j = i + 1; j < t.length; j++) h.set(pairKey(t[i]!, t[j]!), 1)
    return h
  }
  const together = (teams: string[][], a: string[][]) => {
    let n = 0
    for (const t of a)
      for (let i = 0; i < t.length; i++)
        for (let j = i + 1; j < t.length; j++)
          if (teams.some((x) => x.includes(t[i]!) && x.includes(t[j]!))) n++
    return n
  }

  it('evita repetir las parejas de la alineación anterior', () => {
    const base = teamsOf(run({ players: active, tolerance: 1.5, seed: 3 }))
    const history = historyOf(base)
    let withV = 0
    let without = 0
    for (let s = 0; s < 12; s++) {
      withV += together(base, teamsOf(run({ players: active, tolerance: 1.5, seed: s, variety: 1, history })))
      without += together(base, teamsOf(run({ players: active, tolerance: 1.5, seed: s })))
    }
    // Con 6 contra 6 el mínimo inevitable son 12 parejas repetidas por sorteo (3+3 de cada equipo
    // anterior); sin variedad el azar suele dar más. Con variedad se llega siempre al mínimo.
    expect(withV).toBeLessThan(without)
    expect(withV).toBe(12 * 12)
  })

  it('sigue respetando la tolerancia', () => {
    const history = historyOf(teamsOf(run({ players: active, tolerance: 1, seed: 1 })))
    const r = run({ players: active, tolerance: 0.5, seed: 4, variety: 1, history })
    expect(r.ratingDiff).toBeLessThanOrEqual(0.5)
    expect(r.repeat).toBeDefined()
  })

  it('sin historial o con variedad 0 no cambia nada', () => {
    const a = run({ players: active, seed: 9 })
    const b = run({ players: active, seed: 9, variety: 1, history: new Map() })
    expect(ids(a.teamA.players)).toEqual(ids(b.teamA.players))
    expect(a.repeat).toBeUndefined()
  })
})
