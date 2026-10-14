import { describe, expect, it } from 'vitest'
import { SEED_PLAYERS } from './fixtures'
import { formationLabel, formationLines } from './formation'
import type { Player } from './types'

describe('formationLines', () => {
  it('pone portero + líneas con todos los jugadores', () => {
    const team = SEED_PLAYERS.slice(0, 7)
    const lines = formationLines(team)
    expect(lines[0]).toHaveLength(1)
    expect(lines.flat()).toHaveLength(7)
    expect(formationLabel(team)).toBe('3-3')
  })

  it('usa pocas líneas y reparte los sobrantes hacia atrás', () => {
    expect(formationLabel(SEED_PLAYERS.slice(0, 6))).toBe('3-2')
    expect(formationLabel(SEED_PLAYERS.slice(0, 5))).toBe('2-2')
    expect(formationLabel(SEED_PLAYERS.slice(0, 4))).toBe('3')
    expect(formationLabel(SEED_PLAYERS.slice(0, 9))).toBe('4-4')
    expect(formationLabel(SEED_PLAYERS.slice(0, 11))).toBe('4-3-3')
    expect(formationLabel(SEED_PLAYERS.slice(0, 2))).toBe('1')
    expect(formationLines([])).toEqual([])
  })

  it('el más defensivo va a portería', () => {
    const team = SEED_PLAYERS.slice(0, 8)
    const keeper = formationLines(team)[0]![0]!
    const score = (p: Player) => p.stats.def + p.stats.fis * 0.5 - p.stats.tir - p.stats.reg * 0.5
    expect(Math.max(...team.map(score))).toBe(score(keeper))
  })

  it('el capitán va al frente y en el centro', () => {
    const team = SEED_PLAYERS.slice(0, 7)
    for (const cap of team) {
      const lines = formationLines(team, cap.id)
      const front = lines[lines.length - 1]!
      expect(front[Math.floor((front.length - 1) / 2)]!.id).toBe(cap.id)
      expect(lines.flat()).toHaveLength(7)
      expect(new Set(lines.flat().map((p) => p.id)).size).toBe(7)
      expect(lines.map((l) => l.length)).toEqual(formationLines(team).map((l) => l.length))
    }
  })

  it('sin capitán o con un capitán de otro equipo no cambia nada', () => {
    const team = SEED_PLAYERS.slice(0, 6)
    expect(formationLines(team, 'otro')).toEqual(formationLines(team))
    expect(formationLines(team, null)).toEqual(formationLines(team))
  })
})
