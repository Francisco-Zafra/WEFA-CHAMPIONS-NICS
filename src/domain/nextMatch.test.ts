import { describe, expect, it } from 'vitest'
import { emptyTie, type Cup } from './cup'
import { countdown, kickoffOf, lastDuel, lastPlace, nextMatch } from './nextMatch'
import type { ClubId, Match } from './types'

const p = (id: string) => ({ id, name: id, rating: 80 })

let n = 0
const match = (over: Partial<Match>): Match => ({
  id: `m${n++}`,
  date: '2026-10-21',
  time: null,
  place: null,
  createdAt: n,
  clubA: 'flamingo',
  clubB: 'tiburones',
  captainA: null,
  captainB: null,
  teamA: [p('a')],
  teamB: [p('b')],
  scoreA: null,
  scoreB: null,
  mvp: null,
  ...over,
})

const SEEDS: ClubId[] = [
  'avispas',
  'jabalies',
  'pinguinardos',
  'beetles',
  'tiburones',
  'pandas',
  'flamingo',
  'patos',
]

describe('nextMatch', () => {
  const now = new Date('2026-10-15T12:00:00')

  it('elige el pendiente más cercano en el futuro', () => {
    const next = nextMatch(
      [
        match({ date: '2026-10-28' }),
        match({ date: '2026-10-21', time: '20:30', place: 'Polideportivo' }),
        match({ date: '2026-10-08', scoreA: 1, scoreB: 0 }),
      ],
      [],
      now,
    )
    expect(next?.date).toBe('2026-10-21')
    expect(next?.place).toBe('Polideportivo')
    expect(next?.kickoff.getHours()).toBe(20)
  })

  it('un partido que empezó hace poco sigue siendo el próximo', () => {
    const next = nextMatch(
      [match({ date: '2026-10-15', time: '11:00' }), match({ date: '2026-10-21' })],
      [],
      now,
    )
    expect(next?.date).toBe('2026-10-15')
  })

  it('incluye cruces de copa con equipos sorteados', () => {
    const ties = Array.from({ length: 7 }, emptyTie)
    ties[0] = { ...emptyTie(), date: '2026-10-18', time: '19:00', teamA: [p('x')], teamB: [p('y')] }
    const cup: Cup = { id: 'c', name: 'Copa NICS', createdAt: 0, seeds: SEEDS, ties }
    const next = nextMatch([match({ date: '2026-10-21' })], [cup], now)
    expect(next).toMatchObject({
      kind: 'cup',
      cupName: 'Copa NICS',
      tie: 0,
      clubA: 'avispas',
      clubB: 'jabalies',
    })
  })

  it('sin pendientes no hay próximo partido', () => {
    expect(nextMatch([match({ scoreA: 2, scoreB: 2 })], [], now)).toBeNull()
  })
})

describe('lastDuel', () => {
  it('encuentra el último enfrentamiento en cualquier orden', () => {
    const duel = lastDuel(
      [
        match({ date: '2026-09-30', scoreA: 1, scoreB: 0 }),
        match({ date: '2026-10-07', clubA: 'tiburones', clubB: 'flamingo', scoreA: 3, scoreB: 4 }),
        match({ date: '2026-10-10', clubB: 'patos', scoreA: 5, scoreB: 0 }),
      ],
      [],
      'flamingo',
      'tiburones',
    )
    expect(duel).toEqual({ date: '2026-10-07', goalsA: 4, goalsB: 3 })
  })
})

describe('lastPlace', () => {
  it('propone el campo del último partido guardado', () => {
    expect(
      lastPlace(
        [
          match({ date: '2026-10-01', place: 'Viejo' }),
          match({ date: '2026-10-08', place: 'Nuevo' }),
          match({ date: '2026-10-10', place: null }),
        ],
        [],
      ),
    ).toBe('Nuevo')
    expect(lastPlace([], [])).toBeNull()
  })
})

describe('countdown', () => {
  it('desglosa el tiempo que falta', () => {
    const ko = kickoffOf('2026-10-16', '21:00')
    const c = countdown(ko, new Date('2026-10-15T19:58:30').getTime())
    expect(c).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 30, started: false })
    expect(countdown(ko, ko.getTime() + 1000).started).toBe(true)
  })
})
