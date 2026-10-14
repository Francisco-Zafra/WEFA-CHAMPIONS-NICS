import { describe, expect, it } from 'vitest'
import { SEED_PLAYERS } from './fixtures'
import { formationLabel, formationLines } from './formation'
import type { Player } from './types'

describe('formationLines', () => {
  it('pone portero + 3 líneas con todos los jugadores', () => {
    const team = SEED_PLAYERS.slice(0, 7)
    const lines = formationLines(team)
    expect(lines[0]).toHaveLength(1)
    expect(lines.flat()).toHaveLength(7)
    expect(formationLabel(team)).toBe('2-2-2')
  })

  it('reparte los sobrantes hacia atrás', () => {
    expect(formationLabel(SEED_PLAYERS.slice(0, 6))).toBe('2-2-1')
    expect(formationLabel(SEED_PLAYERS.slice(0, 5))).toBe('2-1-1')
    expect(formationLabel(SEED_PLAYERS.slice(0, 2))).toBe('1')
    expect(formationLines([])).toEqual([])
  })

  it('el más defensivo va a portería', () => {
    const team = SEED_PLAYERS.slice(0, 8)
    const keeper = formationLines(team)[0]![0]!
    const score = (p: Player) => p.stats.def + p.stats.fis * 0.5 - p.stats.tir - p.stats.reg * 0.5
    expect(Math.max(...team.map(score))).toBe(score(keeper))
  })
})
