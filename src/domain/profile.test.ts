import { describe, expect, it } from 'vitest'
import { playerProfile, rivalries } from './profile'
import type { ClubId, Match } from './types'

const p = (id: string) => ({ id, name: id.toUpperCase(), rating: 80 })
let n = 0
const match = (
  date: string,
  a: string[],
  b: string[],
  scoreA: number | null,
  scoreB: number | null,
  over: Partial<Match> = {},
): Match => ({
  id: `m${n++}`,
  date,
  time: null,
  place: null,
  createdAt: n,
  clubA: 'flamingo' as ClubId,
  clubB: 'tiburones' as ClubId,
  captainA: null,
  captainB: null,
  teamA: a.map(p),
  teamB: b.map(p),
  scoreA,
  scoreB,
  mvp: null,
  ...over,
})

const matches = [
  match('2026-10-01', ['x', 'a'], ['y', 'b'], 3, 1, { mvp: 'x' }),
  match('2026-10-08', ['x', 'a'], ['y', 'c'], 2, 0),
  match('2026-10-15', ['y', 'b'], ['x', 'a'], 4, 1),
  match('2026-10-22', ['x', 'c'], ['y', 'a'], null, null), // pendiente: no cuenta
  match('2026-10-29', ['x', 'b'], ['y', 'a'], 1, 1, { clubB: 'patos' }),
]

describe('playerProfile', () => {
  const x = playerProfile(matches, 'x')

  it('totales, racha y MVP', () => {
    expect(x).toMatchObject({ played: 4, won: 2, drawn: 1, lost: 1, mvps: 1, goalsFor: 7, goalsAgainst: 6 })
    expect(x.winRate).toBe(0.5)
    expect(x.form).toEqual(['W', 'W', 'L', 'D'])
    expect(x.streak).toEqual({ kind: 'D', count: 1 })
    expect(x.bestWinStreak).toBe(2)
    expect(x.recent[0]!.match.date).toBe('2026-10-29')
  })

  it('compañeros y rivales (mínimo 2 partidos)', () => {
    expect(x.bestPartners[0]).toMatchObject({ id: 'a', played: 3, won: 2 })
    expect(x.nemeses.map((r) => r.id)).toContain('y')
    expect(x.victims.some((r) => r.id === 'c')).toBe(false) // solo 1 partido contra c
  })

  it('no lista como «mejores» a quien nunca ganó ni como «peores» a quien nunca perdió', () => {
    const all = playerProfile(
      [match('2026-10-01', ['x', 'a'], ['y', 'b'], 0, 2), match('2026-10-08', ['x', 'a'], ['y', 'b'], 1, 3)],
      'x',
    )
    expect(all.bestPartners).toEqual([])
    expect(all.victims).toEqual([])
    expect(all.worstPartners[0]!.id).toBe('a')
    expect(all.nemeses.length).toBe(2)
  })

  it('clubes con los que jugó', () => {
    expect(x.clubs.find((c) => c.club === 'flamingo')).toMatchObject({ played: 3 })
    expect(x.clubs.find((c) => c.club === 'tiburones')).toMatchObject({ played: 1, won: 0 })
  })

  it('jugador sin partidos', () => {
    expect(playerProfile(matches, 'nadie')).toMatchObject({ played: 0, streak: null, winRate: 0 })
  })
})

describe('rivalries', () => {
  it('cara a cara entre clubes sin importar el orden', () => {
    const swapped = match('2026-11-05', ['q'], ['w'], 2, 5, { clubA: 'tiburones', clubB: 'flamingo' })
    const r = rivalries([...matches, swapped])
    const ft = r.find((x) => x.a === 'flamingo' && x.b === 'tiburones')!
    expect(ft).toMatchObject({ played: 4, winsA: 4, winsB: 0, drawn: 0, goalsA: 14, goalsB: 4 })
    expect(ft.lastScore).toEqual([5, 2])
    expect(r[0]).toBe(ft)
    expect(r.find((x) => x.b === 'patos')).toMatchObject({ played: 1, drawn: 1 })
  })
})
