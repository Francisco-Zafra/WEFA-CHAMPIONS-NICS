import { describe, expect, it } from 'vitest'
import { balanceTeams, binomial, rebalance, type BalanceOptions } from './balance'
import { SEED_PLAYERS } from './fixtures'
import {} from './rating'

const active = SEED_PLAYERS.filter((p) => p.active)
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
