import { describe, expect, it } from 'vitest'
import type { Match } from './types'
import {
  leaders,
  resolvedMvp,
  tally,
  timeLeft,
  VOTING_MS,
  votingDeadline,
  votingStatus,
  withResolvedMvp,
  type Vote,
} from './votes'

const T0 = Date.parse('2026-10-20T22:00:00Z')

const match = (over: Partial<Match> = {}): Match => ({
  id: 'm1',
  date: '2026-10-20',
  time: null,
  place: null,
  createdAt: 0,
  clubA: 'flamingo',
  clubB: 'tiburones',
  captainA: null,
  captainB: null,
  teamA: [],
  teamB: [],
  scoreA: 3,
  scoreB: 1,
  mvp: null,
  resultAt: T0,
  votingClosed: false,
  ...over,
})

const vote = (uid: string, playerId: string, matchId = 'm1'): Vote => ({
  id: `${matchId}_${uid}`,
  matchId,
  uid,
  playerId,
  at: 0,
})

describe('votingStatus', () => {
  it('abierta 72 h tras el resultado y luego cerrada', () => {
    expect(votingStatus(match(), T0 + 1000)).toBe('open')
    expect(votingStatus(match(), T0 + VOTING_MS - 1)).toBe('open')
    expect(votingStatus(match(), T0 + VOTING_MS)).toBe('closed')
    expect(votingDeadline(match())).toBe(T0 + VOTING_MS)
  })

  it('el admin puede cerrarla antes', () => {
    expect(votingStatus(match({ votingClosed: true }), T0 + 1000)).toBe('closed')
  })

  it('sin resultado, o con resultado antiguo sin fecha, no hay votación', () => {
    expect(votingStatus(match({ scoreA: null, scoreB: null }), T0)).toBe('none')
    expect(votingStatus(match({ resultAt: null }), T0)).toBe('none')
    expect(votingStatus(match({ resultAt: undefined }), T0)).toBe('none')
  })
})

describe('recuento', () => {
  const votes = [vote('u1', 'a'), vote('u2', 'b'), vote('u3', 'a'), vote('u4', 'z', 'otro')]

  it('cuenta solo los votos del partido, de más a menos', () => {
    expect(tally(votes, 'm1')).toEqual([
      { playerId: 'a', votes: 2 },
      { playerId: 'b', votes: 1 },
    ])
  })

  it('líderes con empate y sin votos', () => {
    expect(leaders(tally(votes, 'm1'))).toEqual(['a'])
    expect(leaders(tally([vote('u1', 'a'), vote('u2', 'b')], 'm1'))).toEqual(['a', 'b'])
    expect(leaders([])).toEqual([])
  })
})

describe('MVP resuelto', () => {
  const votes = [vote('u1', 'a'), vote('u2', 'a'), vote('u3', 'b')]

  it('el fijado a mano manda; si no, el más votado con la votación cerrada', () => {
    expect(resolvedMvp(match({ mvp: 'b' }), votes, T0 + VOTING_MS)).toBe('b')
    expect(resolvedMvp(match(), votes, T0 + 1000)).toBeNull() // aún abierta
    expect(resolvedMvp(match(), votes, T0 + VOTING_MS)).toBe('a')
    expect(resolvedMvp(match({ votingClosed: true }), votes, T0 + 1000)).toBe('a')
  })

  it('con empate no hay MVP automático', () => {
    expect(resolvedMvp(match({ votingClosed: true }), [vote('u1', 'a'), vote('u2', 'b')], T0)).toBeNull()
  })

  it('rellena el MVP en la lista de partidos', () => {
    const [m] = withResolvedMvp([match({ votingClosed: true })], votes, T0)
    expect(m!.mvp).toBe('a')
  })
})

describe('timeLeft', () => {
  it('formatea lo que queda', () => {
    const base = T0
    expect(timeLeft(base + 2 * 86400000 + 5 * 3600000, base)).toBe('2 d 5 h')
    expect(timeLeft(base + 3 * 3600000 + 20 * 60000, base)).toBe('3 h 20 min')
    expect(timeLeft(base + 90 * 1000, base)).toBe('1 min')
    expect(timeLeft(base, base)).toBe('menos de 1 min')
  })
})
