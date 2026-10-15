import { describe, expect, it } from 'vitest'
import { emptyTie, type Cup } from './cup'
import type { Match } from './types'
import { HISTORY_DECAY, pairHistory, pairKey } from './variety'

const p = (id: string) => ({ id, name: id, rating: 80 })
let n = 0
const match = (date: string, a: string[], b: string[]): Match => ({
  id: `m${n++}`,
  date,
  time: null,
  place: null,
  createdAt: n,
  clubA: 'flamingo',
  clubB: 'tiburones',
  captainA: null,
  captainB: null,
  teamA: a.map(p),
  teamB: b.map(p),
  scoreA: null,
  scoreB: null,
  mvp: null,
})

describe('pairHistory', () => {
  it('pondera más lo reciente', () => {
    const h = pairHistory(
      [match('2026-10-01', ['a', 'b'], ['c', 'd']), match('2026-10-08', ['a', 'c'], ['b', 'd'])],
      [],
    )
    expect(h.get(pairKey('a', 'c'))).toBe(1)
    expect(h.get(pairKey('a', 'b'))).toBeCloseTo(HISTORY_DECAY)
    expect(h.get(pairKey('a', 'd'))).toBeUndefined()
  })

  it('suma partidos y respeta el límite de memoria', () => {
    const ms = Array.from({ length: 10 }, (_, i) =>
      match(`2026-10-${String(i + 1).padStart(2, '0')}`, ['a', 'b'], ['c']),
    )
    const h = pairHistory(ms, [], 3)
    expect(h.get(pairKey('a', 'b'))).toBeCloseTo(1 + HISTORY_DECAY + HISTORY_DECAY ** 2)
  })

  it('incluye cruces de copa con equipos', () => {
    const ties = Array.from({ length: 7 }, emptyTie)
    ties[0] = { ...emptyTie(), date: '2026-10-05', teamA: [p('x'), p('y')], teamB: [p('z')] }
    const cup: Cup = { id: 'c', name: 'Copa', createdAt: 0, seeds: [], ties } as unknown as Cup
    expect(pairHistory([], [cup]).get(pairKey('x', 'y'))).toBe(1)
  })
})
