import { describe, expect, it } from 'vitest'
import { clubStandings, playerStandings } from './standings'
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
  scoreA: null,
  scoreB: null,
  mvp: null,
  ...over,
})

const matches = [
  match({ date: '2026-10-01', scoreA: 3, scoreB: 1, mvp: 'a' }),
  match({ date: '2026-10-08', scoreA: 2, scoreB: 2, clubB: 'patos' }),
  match({ date: '2026-10-15', scoreA: 0, scoreB: 1, teamB: [p('c'), p('e')], mvp: 'e' }),
  match({ date: '2026-10-22' }), // pendiente: no cuenta
]

describe('clubStandings', () => {
  it('suma puntos, goles y ordena', () => {
    const rows = clubStandings(matches)
    expect(rows).toHaveLength(8)
    expect(rows.find((r) => r.club === 'avispas')).toMatchObject({
      played: 3,
      won: 1,
      drawn: 1,
      lost: 1,
      goalsFor: 5,
      goalsAgainst: 4,
      points: 4,
    })
    expect(rows[0]!.club).toBe('avispas')
    expect(rows.find((r) => r.club === 'pandas')).toMatchObject({ played: 2, points: 3 })
  })
})

describe('playerStandings', () => {
  it('cuenta partidos, MVPs y forma reciente', () => {
    const rows = playerStandings(matches, new Map([['a', 'Ana']]))
    expect(rows.find((r) => r.id === 'a')).toMatchObject({
      name: 'Ana',
      played: 3,
      won: 1,
      drawn: 1,
      lost: 1,
      mvps: 1,
      form: ['W', 'D', 'L'],
    })
    expect(rows.find((r) => r.id === 'e')).toMatchObject({ played: 1, won: 1, mvps: 1, winRate: 1 })
    expect(rows.find((r) => r.id === 'c')!.form).toEqual(['L', 'D', 'W'])
  })
})
