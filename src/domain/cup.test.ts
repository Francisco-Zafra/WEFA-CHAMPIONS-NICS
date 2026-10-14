import { describe, expect, it } from 'vitest'
import {
  champion,
  clearResult,
  cupStatus,
  emptyTie,
  feeders,
  newCup,
  nextPending,
  nextTie,
  participants,
  runnerUp,
  setResult,
  titles,
  type Cup,
} from './cup'
import { createRng } from './rng'
import type { ClubId } from './types'

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

const cup = (): Cup => ({
  id: 'c1',
  name: 'Copa',
  createdAt: 0,
  seeds: [...SEEDS],
  ties: Array.from({ length: 7 }, emptyTie),
})

function play(c: Cup, tie: number, scoreA: number, scoreB: number, winner?: ClubId): Cup {
  const out = setResult(c, tie, { scoreA, scoreB, winner, date: '2026-10-20' })
  if (!out.ok) throw new Error(out.error)
  return { ...c, ties: out.ties }
}

describe('cuadro', () => {
  it('sortea los 8 clubes sin repetir', () => {
    const c = newCup('Copa', createRng(7))
    expect(new Set(c.seeds).size).toBe(8)
    expect(c.ties).toHaveLength(7)
  })

  it('conecta cuartos → semis → final', () => {
    expect([0, 1, 2, 3].map(nextTie)).toEqual([4, 4, 5, 5])
    expect([4, 5, 6].map(nextTie)).toEqual([6, 6, null])
    expect(feeders(0)).toBeNull()
    expect(feeders(5)).toEqual([2, 3])
    expect(feeders(6)).toEqual([4, 5])
  })

  it('los cuartos salen del sorteo y las semis de los ganadores', () => {
    let c = cup()
    expect(participants(c, 0)).toEqual(['avispas', 'jabalies'])
    expect(participants(c, 3)).toEqual(['flamingo', 'patos'])
    expect(participants(c, 4)).toEqual([null, null])
    c = play(c, 0, 2, 1)
    c = play(c, 1, 0, 3)
    expect(participants(c, 4)).toEqual(['avispas', 'beetles'])
  })
})

describe('resultados', () => {
  it('el que marca más pasa; con empate hay que elegir', () => {
    const c = cup()
    expect(setResult(c, 0, { scoreA: 1, scoreB: 1, date: 'x' })).toEqual({ ok: false, error: 'need-winner' })
    expect(setResult(c, 0, { scoreA: 1, scoreB: 1, winner: 'patos', date: 'x' })).toEqual({
      ok: false,
      error: 'invalid-winner',
    })
    const tied = play(c, 0, 1, 1, 'jabalies')
    expect(tied.ties[0]!.winner).toBe('jabalies')
    // Con marcador distinto se ignora el ganador elegido
    expect(play(c, 0, 0, 2, 'avispas').ties[0]!.winner).toBe('jabalies')
  })

  it('no se puede jugar un cruce sin participantes', () => {
    expect(setResult(cup(), 4, { scoreA: 1, scoreB: 0, date: 'x' })).toEqual({
      ok: false,
      error: 'not-ready',
    })
  })

  it('cambiar quién pasa borra lo que dependía de él', () => {
    let c = cup()
    c = play(c, 0, 2, 0)
    c = play(c, 1, 2, 0)
    c = play(c, 4, 1, 0)
    expect(c.ties[4]!.winner).toBe('avispas')
    // Se corrige el cuarto 0: ahora pasa Jabalíes
    c = play(c, 0, 0, 1)
    expect(c.ties[4]).toEqual(emptyTie())
    expect(participants(c, 4)).toEqual(['jabalies', 'pinguinardos'])
    // Corregir el marcador sin cambiar ganador no borra nada
    c = play(c, 4, 3, 0)
    c = play(c, 0, 0, 4)
    expect(c.ties[4]!.winner).toBe('jabalies')
  })

  it('borrar un resultado limpia también las rondas siguientes', () => {
    let c = cup()
    c = play(c, 0, 1, 0)
    c = play(c, 1, 1, 0)
    c = play(c, 4, 1, 0)
    const ties = clearResult(c, 1)
    expect(ties[1]!.winner).toBeNull()
    expect(ties[4]!.winner).toBeNull()
    expect(ties[0]!.winner).toBe('avispas')
  })
})

describe('progreso', () => {
  it('estado, siguiente cruce, campeón y subcampeón', () => {
    let c = cup()
    expect(cupStatus(c)).toBe('draft')
    expect(nextPending(c)).toBe(0)
    c = play(c, 0, 1, 0)
    expect(cupStatus(c)).toBe('playing')
    expect(nextPending(c)).toBe(1)
    for (const t of [1, 2, 3, 4, 5]) c = play(c, t, 2, 1)
    expect(nextPending(c)).toBe(6)
    c = play(c, 6, 0, 2)
    expect(cupStatus(c)).toBe('finished')
    expect(champion(c)).toBe('tiburones')
    expect(runnerUp(c)).toBe('avispas')
    expect(nextPending(c)).toBeNull()
    expect(titles([c, cup()]).get('tiburones')).toBe(1)
  })
})
