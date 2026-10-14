import { describe, expect, it } from 'vitest'
import { lastCaptains, resolveCaptains } from './captains'
import { emptyTie, type Cup } from './cup'
import type { ClubId, Match } from './types'

const p = (id: string) => ({ id, name: id, rating: 80 })

const match = (over: Partial<Match>): Match => ({
  id: Math.random().toString(),
  date: '2026-10-01',
  createdAt: 0,
  clubA: 'flamingo',
  clubB: 'tiburones',
  captainA: null,
  captainB: null,
  teamA: [],
  teamB: [],
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

describe('lastCaptains', () => {
  it('se queda con el capitán más reciente de cada club', () => {
    const caps = lastCaptains(
      [
        match({ date: '2026-10-08', captainA: 'guti', captainB: 'ricc' }),
        match({ date: '2026-10-01', captainA: 'fran' }),
        match({ date: '2026-10-08', createdAt: 5, clubA: 'patos', captainA: 'pablo', captainB: null }),
      ],
      [],
    )
    expect(caps.get('flamingo')).toBe('guti')
    expect(caps.get('tiburones')).toBe('ricc')
    expect(caps.get('patos')).toBe('pablo')
    expect(caps.has('avispas')).toBe(false)
  })

  it('cuenta los cruces de copa con equipos sorteados', () => {
    const ties = Array.from({ length: 7 }, emptyTie)
    ties[0] = {
      ...emptyTie(),
      date: '2026-10-20',
      teamA: [p('x')],
      teamB: [p('y')],
      captainA: 'x',
      captainB: 'y',
    }
    const cup: Cup = { id: 'c', name: 'Copa', createdAt: 0, seeds: SEEDS, ties }
    const caps = lastCaptains([match({ date: '2026-10-10', clubA: 'avispas', captainA: 'old' })], [cup])
    expect(caps.get('avispas')).toBe('x')
    expect(caps.get('jabalies')).toBe('y')
  })
})

describe('resolveCaptains', () => {
  const defaults = new Map<ClubId, string>([
    ['flamingo', 'guti'],
    ['tiburones', 'ricc'],
  ])
  const selected = new Set(['guti', 'ricc', 'fran'])
  const base = { clubA: 'flamingo' as ClubId, clubB: 'tiburones' as ClubId }

  it('automático: el último capitán si está convocado', () => {
    expect(resolveCaptains(base, selected, defaults)).toEqual(['guti', 'ricc'])
    expect(resolveCaptains(base, new Set(['fran']), defaults)).toEqual([null, null])
  })

  it('lo elegido a mano manda, también «sin capitán»', () => {
    expect(resolveCaptains({ ...base, captainA: 'fran', captainB: null }, selected, defaults)).toEqual([
      'fran',
      null,
    ])
  })

  it('el B nunca repite al A', () => {
    const same = new Map<ClubId, string>([
      ['flamingo', 'guti'],
      ['tiburones', 'guti'],
    ])
    expect(resolveCaptains(base, selected, same)).toEqual(['guti', null])
  })
})
