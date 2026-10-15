import { describe, expect, it } from 'vitest'
import { calibrate, drawQuality, expectedScore, headToHead, records, talisman, timeline } from './insights'
import { gamesOf } from './profile'
import type { ClubId, Match, Player } from './types'

let n = 0
const match = (
  a: [string, number][],
  b: [string, number][],
  scoreA: number | null,
  scoreB: number | null,
  over: Partial<Match> = {},
): Match => ({
  id: `m${n}`,
  date: `2026-10-${String(++n).padStart(2, '0')}`,
  time: null,
  place: null,
  createdAt: n,
  clubA: 'flamingo' as ClubId,
  clubB: 'tiburones' as ClubId,
  captainA: null,
  captainB: null,
  teamA: a.map(([id, rating]) => ({ id, name: id.toUpperCase(), rating })),
  teamB: b.map(([id, rating]) => ({ id, name: id.toUpperCase(), rating })),
  scoreA,
  scoreB,
  mvp: null,
  ...over,
})
const player = (id: string, rating: number): Player => ({
  id,
  name: id.toUpperCase(),
  rating,
  stats: { rit: rating, tir: rating, pas: rating, reg: rating, def: rating, fis: rating },
  avatar: null,
  active: true,
})

describe('expectedScore', () => {
  it('es 50 % con medias iguales y crece con la ventaja', () => {
    expect(expectedScore(0)).toBe(0.5)
    expect(expectedScore(10)).toBeCloseTo(0.76, 2)
    expect(expectedScore(-10)).toBeCloseTo(0.24, 2)
  })
})

describe('calibrate', () => {
  // «g» gana siempre en partidos igualados; «l» pierde siempre
  const games = Array.from({ length: 8 }, () =>
    match(
      [
        ['g', 80],
        ['x', 80],
      ],
      [
        ['l', 80],
        ['y', 80],
      ],
      2,
      1,
    ),
  )

  it('sugiere subir al que gana más de lo esperado y bajar al que pierde', () => {
    const rows = calibrate(games, [player('g', 80), player('x', 80), player('l', 80), player('y', 80)])
    const g = rows.find((r) => r.id === 'g')!
    const l = rows.find((r) => r.id === 'l')!
    expect(g).toMatchObject({ played: 8, won: 8, expected: 0.5, actual: 1, delta: 3 })
    expect(l.delta).toBe(-3)
  })

  it('no sugiere nada si la diferencia puede ser suerte', () => {
    // 5 victorias y 3 derrotas en partidos igualados: por encima, pero no lo bastante
    const mixed = games.map((m, i) => (i < 3 ? { ...m, scoreA: 0, scoreB: 1 } : m))
    const rows = calibrate(mixed, [player('g', 80)])
    expect(rows[0]).toMatchObject({ played: 8, won: 5, delta: 0 })
  })

  it('no sugiere nada con pocos partidos', () => {
    const rows = calibrate(games.slice(0, 4), [player('g', 80)])
    expect(rows[0]).toMatchObject({ played: 4, delta: 0 })
  })

  it('al cambiar la media, la cuenta empieza de cero', () => {
    const rows = calibrate(games, [player('g', 83)])
    expect(rows.find((r) => r.id === 'g')).toBeUndefined()
  })
})

describe('drawQuality', () => {
  it('cuenta partidos igualados, margen y aciertos del favorito', () => {
    const q = drawQuality([
      match([['a', 82]], [['b', 80]], 3, 2), // favorito A gana por 1
      match([['a', 80]], [['b', 82]], 4, 0), // favorito B pierde por 4
      match([['a', 80]], [['b', 80]], 1, 1), // empate
      match([['a', 80]], [['b', 80]], null, null), // sin jugar
    ])
    expect(q).toMatchObject({ played: 3, close: 2, decided: 2, favoriteWon: 1, draws: 1 })
    expect(q.avgMargin).toBeCloseTo(5 / 3)
    expect(q.avgGap).toBeCloseTo(4 / 3)
  })
})

describe('records', () => {
  const ms = [
    match(
      [
        ['a', 80],
        ['b', 80],
      ],
      [
        ['c', 80],
        ['d', 80],
      ],
      5,
      0,
      { mvp: 'a' },
    ),
    match(
      [
        ['a', 80],
        ['b', 80],
      ],
      [
        ['c', 80],
        ['d', 80],
      ],
      2,
      1,
      { mvp: 'a' },
    ),
    match(
      [
        ['a', 80],
        ['b', 80],
      ],
      [
        ['c', 80],
        ['d', 80],
      ],
      4,
      4,
    ),
    match(
      [
        ['a', 80],
        ['c', 80],
      ],
      [
        ['b', 80],
        ['d', 80],
      ],
      0,
      1,
    ),
  ]
  const r = records(
    ms,
    ['a', 'b', 'c', 'd'].map((id) => player(id, 80)),
  )

  it('mayor goleada y partido con más goles', () => {
    expect(r.biggestWin).toMatchObject({ value: 5, match: { id: ms[0]!.id } })
    expect(r.mostGoals).toMatchObject({ value: 8, match: { id: ms[2]!.id } })
  })

  it('rachas, MVPs y partidos jugados', () => {
    expect(r.bestStreak).toMatchObject({ names: ['A', 'B'], value: 2 })
    expect(r.mostMvps).toMatchObject({ names: ['A'], value: 2 })
    expect(r.mostPlayed!.value).toBe(4)
  })

  it('parejas: la más ganadora y la que más pierde (mín. 3 juntos)', () => {
    expect(r.bestDuo).toMatchObject({ ids: ['a', 'b'], played: 3, won: 2 })
    expect(r.worstDuo).toMatchObject({ ids: ['c', 'd'], played: 3, lost: 2 })
  })

  it('el % de victorias necesita partidos suficientes', () => {
    expect(r.bestWinRate).toBeNull()
  })
})

describe('headToHead', () => {
  const ms = [
    match(
      [
        ['a', 80],
        ['b', 80],
      ],
      [['c', 80]],
      2,
      0,
    ),
    match([['a', 80]], [['b', 80]], 0, 1),
    match([['b', 80]], [['a', 80]], 1, 1),
  ]
  it('separa partidos juntos y enfrentados', () => {
    const h = headToHead(ms, 'a', 'b')
    expect(h.together).toEqual({ played: 1, won: 1, drawn: 0, lost: 0 })
    expect(h.against).toEqual({ played: 2, winsA: 0, winsB: 1, drawn: 1 })
    expect(h.games.map((g) => g.match.id)).toEqual([ms[2]!.id, ms[1]!.id, ms[0]!.id])
  })
})

describe('timeline y talismán', () => {
  const ms = [
    match([['a', 80]], [['b', 80]], 1, 0),
    match([['a', 80]], [['b', 80]], 0, 1, { clubA: 'patos' }),
    match([['a', 80]], [['b', 80]], 2, 0),
    match([['a', 80]], [['b', 80]], 1, 1, { clubA: 'patos' }),
  ]
  const games = gamesOf(ms, 'a')

  it('acumula el % de victorias partido a partido', () => {
    expect(timeline(games).map((p) => p.winRate)).toEqual([1, 0.5, 2 / 3, 0.5])
  })

  it('el talismán es el club con el que gana más que en general', () => {
    expect(talisman(games)).toBe('flamingo')
    expect(talisman(gamesOf(ms, 'b'))).toBeNull()
    // Dos clubes igual de buenos: ninguno es talismán
    const tied = [
      ...ms,
      match([['a', 80]], [['b', 80]], 1, 0, { clubA: 'patos' }),
      match([['a', 80]], [['b', 80]], 1, 0, { clubA: 'avispas' }),
      match([['a', 80]], [['b', 80]], 1, 0, { clubA: 'avispas' }),
    ]
    expect(talisman(gamesOf(tied, 'a'))).toBeNull()
  })
})
