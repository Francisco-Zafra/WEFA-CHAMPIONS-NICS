import { describe, expect, it } from 'vitest'
import {
  feat,
  goalRecords,
  goalSummary,
  goalsPerMatch,
  hasScorers,
  scorerTable,
  scorersBySide,
  tallyGoals,
  tallyWarning,
  topScorerByClub,
  topScorerLabel,
} from './goals'
import type { Match, MatchGoals } from './types'

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
  scoreA: 3,
  scoreB: 1,
  mvp: null,
  ...over,
})

const goals = (byPlayer: Record<string, number>, ownA = 0, ownB = 0): MatchGoals => ({ byPlayer, ownA, ownB })

describe('cuadrar con el marcador', () => {
  it('suma los goles de cada equipo y los de propia puerta', () => {
    const m = match({})
    const t = tallyGoals(m, goals({ a: 2, c: 1 }, 1))
    expect(t.A).toEqual({ score: 3, recorded: 3, missing: 0 })
    expect(t.B).toEqual({ score: 1, recorded: 1, missing: 0 })
    expect(t.ok).toBe(true)
  })

  it('avisa de lo que falta o sobra', () => {
    const t = tallyGoals(match({}), goals({ a: 1, c: 2 }))
    expect(t.ok).toBe(false)
    expect(tallyWarning(t.A, 'Avispas')).toBe('Faltan 2 goles por apuntar en Avispas')
    expect(tallyWarning(t.B, 'Pandas')).toBe('Sobra 1 gol en Pandas: su marcador es 1')
    expect(tallyWarning(tallyGoals(match({}), goals({ a: 3, c: 1 })).A, 'X')).toBeNull()
  })

  it('un gol de alguien que no jugó no cuenta', () => {
    expect(tallyGoals(match({}), goals({ z: 3, c: 1 })).A.recorded).toBe(0)
  })
})

describe('goleadores de un partido', () => {
  it('ordena por goles y deja la propia puerta al final', () => {
    const m = match({ goals: goals({ a: 1, b: 2, c: 1 }) })
    const s = scorersBySide(m)
    expect(s.A.map((x) => [x.name, x.goals])).toEqual([
      ['B', 2],
      ['A', 1],
    ])
    expect(scorersBySide(match({ goals: goals({}, 0, 1) })).B).toEqual([
      { id: null, name: 'En propia puerta', goals: 1 },
    ])
  })

  it('sabe si un partido tiene goleadores', () => {
    expect(hasScorers(match({}))).toBe(false)
    expect(hasScorers(match({ goals: goals({}) }))).toBe(false)
    expect(hasScorers(match({ goals: goals({ a: 1 }) }))).toBe(true)
    expect(hasScorers(match({ scoreA: 0, scoreB: 0, goals: goals({}) }))).toBe(true)
    expect(hasScorers(match({ scoreA: null, scoreB: null, goals: goals({ a: 1 }) }))).toBe(false)
  })

  it('pone nombre a las rachas de un partido', () => {
    expect([1, 2, 3, 4, 5, 6].map(feat)).toEqual([null, 'DOBLETE', 'HAT-TRICK', 'PÓKER', 'MANITA', 'MANITA'])
  })

  it('resume al máximo goleador para el historial', () => {
    expect(topScorerLabel(match({ goals: goals({ a: 1, c: 3 }) }))).toBe('C ×3')
    expect(topScorerLabel(match({ goals: goals({ a: 1, c: 1 }) }))).toBe('A, C')
    expect(topScorerLabel(match({ goals: goals({ a: 1, b: 1, c: 1 }) }))).toBe('A, B y 1 más')
    expect(topScorerLabel(match({ goals: goals({}, 3, 1) }))).toBeNull()
    expect(topScorerLabel(match({}))).toBeNull()
  })
})

describe('estadísticas de goles', () => {
  const ms = [
    match({ date: '2026-10-01', goals: goals({ a: 3, c: 1 }) }),
    match({ date: '2026-10-08', scoreA: 2, scoreB: 2, goals: goals({ a: 1, b: 1, c: 1 }, 0, 1) }),
    match({ date: '2026-10-15', scoreA: 1, scoreB: 0, clubA: 'patos', goals: goals({ b: 1 }) }),
    match({ date: '2026-10-22', scoreA: 4, scoreB: 0 }), // sin goleadores: no cuenta
  ]

  it('resume los partidos y goles apuntados', () => {
    expect(goalSummary(ms)).toEqual({ matches: 3, goals: 8, own: 1 })
    expect(goalsPerMatch(ms).map((x) => x.goals)).toEqual([4, 4, 1])
  })

  it('saca la tabla de goleadores', () => {
    const t = scorerTable(ms)
    expect(t[0]).toMatchObject({ id: 'a', goals: 4, withGoal: 2, played: 3, hatTricks: 1, streak: 2 })
    expect(t[0]!.best).toMatchObject({ goals: 3 })
    expect(t[0]!.perMatch).toBeCloseTo(4 / 3)
    expect(t.find((r) => r.id === 'b')).toMatchObject({ goals: 2, streak: 2 })
    expect(t.find((r) => r.id === 'd')).toMatchObject({ goals: 0, played: 3, streak: 0 })
  })

  it('saca el máximo goleador de cada club', () => {
    const by = topScorerByClub(ms)
    expect(by.find((c) => c.club === 'avispas')).toMatchObject({ names: ['A'], goals: 4 })
    expect(by.find((c) => c.club === 'pandas')).toMatchObject({ names: ['C'], goals: 2 })
    expect(by.find((c) => c.club === 'patos')).toMatchObject({ names: ['B'], goals: 1 })
  })

  it('saca los récords de goles', () => {
    const r = goalRecords(ms, new Map(), 2)
    expect(r.mostInMatch).toMatchObject({ names: ['A'], value: 3 })
    expect(r.mostHatTricks).toMatchObject({ names: ['A'], value: 1 })
    expect(r.scoringStreak).toMatchObject({ names: ['A', 'B', 'C'], value: 2 })
    expect(r.bestDuo).toMatchObject({ ids: ['a', 'b'], goals: 6, played: 3 })
    expect(goalRecords([]).mostInMatch).toBeNull()
  })
})
