import { describe, expect, it } from 'vitest'
import {
  applyFilter,
  clearFilter,
  defaultFilter,
  emptyFilter,
  filterChips,
  placesIn,
  relaxations,
  removeChip,
  seasonLabel,
  seasonOf,
  seasonsIn,
  type StatsFilter,
} from './filters'
import type { Match } from './types'

const p = (id: string) => ({ id, name: id.toUpperCase(), rating: 80 })
const NOW = new Date(2026, 9, 16) // 16 oct 2026

let nextId = 0
const match = (over: Partial<Match>): Match => ({
  id: String(nextId++),
  date: '2026-10-01',
  time: null,
  place: 'Campo Norte',
  createdAt: 0,
  clubA: 'avispas',
  clubB: 'pandas',
  captainA: null,
  captainB: null,
  teamA: [p('guti'), p('fran')],
  teamB: [p('ric'), p('ser')],
  scoreA: 3,
  scoreB: 1,
  mvp: null,
  ...over,
})

const f = (over: Partial<StatsFilter>): StatsFilter => ({ ...emptyFilter(), ...over })
const ids = (ms: Match[]) => ms.map((m) => m.id)

const cup = { id: 'c1', name: 'Copa NICS 1', label: 'Cuartos 1', tie: 0 }
const M = {
  oct: match({ date: '2026-10-08' }),
  sep: match({
    date: '2026-09-20',
    teamA: [p('guti'), p('ric')],
    teamB: [p('fran'), p('ser')],
    scoreA: 1,
    scoreB: 1,
  }),
  jun: match({ date: '2026-06-10', clubA: 'patos', place: 'Campo Sur', scoreA: 7, scoreB: 1 }),
  cupQf: match({ date: '2026-10-02', cup, scoreA: 2, scoreB: 2, winner: 'pandas' }),
  cupF: match({ date: '2025-05-02', cup: { ...cup, label: 'Final', tie: 6 }, scoreA: 0, scoreB: 1 }),
  goals: match({ date: '2026-10-12', goals: { byPlayer: { guti: 3 }, ownA: 0, ownB: 1 } }),
  pending: match({ date: '2026-10-20', scoreA: null, scoreB: null }),
}
const ALL = Object.values(M)

describe('temporadas', () => {
  it('van de septiembre a agosto y se nombran por sus dos años', () => {
    expect(seasonOf('2026-09-01')).toBe(2026)
    expect(seasonOf('2026-08-31')).toBe(2025)
    expect(seasonOf('2026-01-15')).toBe(2025)
    expect(seasonLabel(2025)).toBe('2025/26')
    expect(seasonLabel(2099)).toBe('2099/00')
    expect(seasonsIn(ALL)).toEqual([2026, 2025, 2024])
  })

  it('se abre en la temporada actual', () => {
    expect(defaultFilter(NOW).dates).toEqual({ kind: 'season', start: 2026 })
  })
})

describe('applyFilter', () => {
  it('sin filtros devuelve los jugados', () => {
    expect(applyFilter(ALL, emptyFilter(), NOW)).toHaveLength(ALL.length - 1)
  })

  it('filtra por competición, copa y ronda', () => {
    expect(ids(applyFilter(ALL, f({ comp: 'friendly' }), NOW))).not.toContain(M.cupQf.id)
    expect(ids(applyFilter(ALL, f({ comp: 'cup' }), NOW))).toEqual([M.cupQf.id, M.cupF.id])
    expect(ids(applyFilter(ALL, f({ comp: 'cup', rounds: ['f'] }), NOW))).toEqual([M.cupF.id])
    expect(applyFilter(ALL, f({ comp: 'cup', cupId: 'otra' }), NOW)).toEqual([])
  })

  it('filtra por fechas', () => {
    expect(ids(applyFilter(ALL, defaultFilter(NOW), NOW))).toEqual([
      M.oct.id,
      M.sep.id,
      M.cupQf.id,
      M.goals.id,
    ])
    expect(applyFilter(ALL, f({ dates: { kind: 'month' } }), NOW)).toHaveLength(3)
    expect(applyFilter(ALL, f({ dates: { kind: 'quarter' } }), NOW)).toHaveLength(4)
    expect(
      ids(applyFilter(ALL, f({ dates: { kind: 'range', from: '2026-06-01', to: '2026-09-30' } }), NOW)),
    ).toEqual([M.sep.id, M.jun.id])
  })

  it('filtra por jugadores: alguno, juntos o enfrentados', () => {
    const two = { players: ['guti', 'fran'] }
    expect(applyFilter(ALL, f({ ...two, playersMode: 'together' }), NOW)).not.toContainEqual(M.sep)
    expect(ids(applyFilter(ALL, f({ ...two, playersMode: 'against' }), NOW))).toEqual([M.sep.id])
    expect(applyFilter(ALL, f({ ...two, playersMode: 'any' }), NOW)).toHaveLength(ALL.length - 1)
  })

  it('filtra por club o por enfrentamiento entre dos clubes', () => {
    expect(ids(applyFilter(ALL, f({ clubs: ['patos'] }), NOW))).toEqual([M.jun.id])
    expect(applyFilter(ALL, f({ clubs: ['avispas', 'pandas'] }), NOW)).not.toContainEqual(M.jun)
  })

  it('filtra por campo, resultado y goleadores', () => {
    expect(ids(applyFilter(ALL, f({ places: ['Campo Sur'] }), NOW))).toEqual([M.jun.id])
    expect(ids(applyFilter(ALL, f({ results: ['rout'] }), NOW))).toEqual([M.jun.id])
    expect(ids(applyFilter(ALL, f({ results: ['pens'] }), NOW))).toEqual([M.cupQf.id])
    expect(ids(applyFilter(ALL, f({ withScorers: true }), NOW))).toEqual([M.goals.id])
    // Desde el lado de Guti: el 1–1 es empate y el 2–2 de copa lo perdió en los penaltis
    const guti = { players: ['guti'] }
    expect(ids(applyFilter(ALL, f({ ...guti, results: ['drawn'] }), NOW))).toEqual([M.sep.id])
    expect(applyFilter(ALL, f({ ...guti, results: ['lost'] }), NOW)).toContainEqual(M.cupQf)
    // Sin jugador ni club, «empatados» son los empates sin penaltis
    expect(ids(applyFilter(ALL, f({ results: ['drawn'] }), NOW))).toEqual([M.sep.id])
  })
})

describe('chips', () => {
  const names = { player: (id: string) => id.toUpperCase(), cup: () => 'Copa NICS 1' }
  const full = f({
    comp: 'cup',
    cupId: 'c1',
    rounds: ['qf'],
    dates: { kind: 'season', start: 2026 },
    players: ['guti', 'fran'],
    clubs: ['patos'],
    results: ['pens'],
    withScorers: true,
  })

  it('describe los filtros activos', () => {
    expect(filterChips(full, names).map((c) => c.label)).toEqual([
      'Copa NICS 1',
      'Cuartos',
      'Temporada 2026/27',
      'GUTI y FRAN juntos',
      'Patos',
      'Penaltis',
      'Con goleadores',
    ])
    expect(filterChips(f({ players: ['guti', 'fran'], playersMode: 'against' }), names)[0]!.label).toBe(
      'GUTI contra FRAN',
    )
    expect(
      filterChips(f({ dates: { kind: 'range', from: '2026-09-01', to: '2026-10-16' } }), names)[0]!.label,
    ).toBe('1 sep – 16 oct')
  })

  it('quita un chip o todos', () => {
    expect(removeChip(full, 'comp')).toMatchObject({ comp: 'all', cupId: null, rounds: [] })
    expect(removeChip(full, 'club:patos').clubs).toEqual([])
    expect(clearFilter({ ...full, mins: { winRate: 3, duo: 2, mates: 1 } })).toEqual({
      ...emptyFilter(),
      mins: { winRate: 3, duo: 2, mates: 1 },
    })
  })

  it('propone qué quitar cuando no queda ningún partido', () => {
    const none = f({ clubs: ['patos'], comp: 'cup' })
    expect(applyFilter(ALL, none, NOW)).toEqual([])
    const s = relaxations(ALL, none, names, NOW)
    expect(s.map((x) => [x.chip.label, x.count])).toEqual([
      ['Patos', 2],
      ['Solo copa', 1],
    ])
  })

  it('lista los campos por uso', () => {
    expect(placesIn(ALL)).toEqual(['Campo Norte', 'Campo Sur'])
  })
})
