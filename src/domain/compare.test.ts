import { describe, expect, it } from 'vitest'
import { clubComparison, formatCompare, playerComparison, rowWinner } from './compare'
import type { Match } from './types'

const p = (id: string) => ({ id, name: id.toUpperCase(), rating: 80 })
let nextId = 0
const match = (over: Partial<Match>): Match => ({
  id: String(nextId++),
  date: '2026-10-01',
  time: null,
  place: null,
  createdAt: 0,
  clubA: 'avispas',
  clubB: 'pandas',
  captainA: null,
  captainB: null,
  teamA: [p('a'), p('b')],
  teamB: [p('c'), p('d')],
  scoreA: 2,
  scoreB: 1,
  mvp: null,
  ...over,
})

describe('comparar', () => {
  const ms = [
    match({ mvp: 'a', goals: { byPlayer: { a: 2, c: 1 }, ownA: 0, ownB: 0 } }),
    match({ date: '2026-10-08', scoreA: 0, scoreB: 1 }),
  ]

  it('pone a dos jugadores lado a lado', () => {
    const rows = playerComparison(ms, 'a', 'c')
    const by = Object.fromEntries(rows.map((r) => [r.label, r]))
    expect(by['Victorias']).toMatchObject({ a: 1, b: 1 })
    expect(by['MVP']).toMatchObject({ a: 1, b: 0 })
    expect(by['Goles']).toMatchObject({ a: 2, b: 1 })
    expect(rowWinner(by['MVP']!)).toBe('a')
    expect(rowWinner(by['Victorias']!)).toBeNull()
    expect(rowWinner({ label: 'Derrotas', a: 1, b: 3, better: 'low', format: 'int' })).toBe('a')
  })

  it('sin goleadores no saca las cifras de goles', () => {
    expect(playerComparison([ms[1]!], 'a', 'c').map((r) => r.label)).not.toContain('Goles')
  })

  it('pone a dos clubes lado a lado', () => {
    const rows = clubComparison(ms, [], 'avispas', 'pandas')
    expect(rows.find((r) => r.label === 'Puntos')).toMatchObject({ a: 3, b: 3 })
    expect(rows.find((r) => r.label === 'Goles a favor')).toMatchObject({ a: 2, b: 2 })
  })

  it('da formato a las cifras', () => {
    expect([formatCompare(66.4, 'pct'), formatCompare(1.266, 'dec'), formatCompare(7, 'streak')]).toEqual([
      '66 %',
      '1,27',
      '7V',
    ])
  })
})
