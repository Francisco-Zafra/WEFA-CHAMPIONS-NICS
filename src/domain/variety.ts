import type { Cup } from './cup'
import type { Match } from './types'

/** Clave estable de una pareja de jugadores */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Cuántas alineaciones recientes se miran y cuánto pesa cada una menos que la anterior */
export const HISTORY_LOOKBACK = 6
export const HISTORY_DECAY = 0.7

interface Lineup {
  date: string
  order: number
  teams: string[][]
}

/**
 * Cuánto han coincidido en el mismo equipo (por parejas) en las últimas alineaciones, con más
 * peso a las más recientes: 1 si coincidieron en el último partido, 0,7 hace dos, 0,49 hace tres…
 * Cuentan amistosos y cruces de copa con equipos sorteados.
 */
export function pairHistory(
  matches: Match[],
  cups: Cup[],
  lookback = HISTORY_LOOKBACK,
  decay = HISTORY_DECAY,
): Map<string, number> {
  const lineups: Lineup[] = []
  for (const m of matches) {
    if (m.teamA.length + m.teamB.length === 0) continue
    lineups.push({
      date: m.date,
      order: m.createdAt,
      teams: [m.teamA.map((p) => p.id), m.teamB.map((p) => p.id)],
    })
  }
  for (const cup of cups)
    cup.ties.forEach((t, i) => {
      if (t.teamA.length + t.teamB.length === 0) return
      lineups.push({
        date: t.date ?? '',
        order: cup.createdAt + i,
        teams: [t.teamA.map((p) => p.id), t.teamB.map((p) => p.id)],
      })
    })

  lineups.sort((x, y) => y.date.localeCompare(x.date) || y.order - x.order)
  const out = new Map<string, number>()
  lineups.slice(0, lookback).forEach((lineup, rank) => {
    const weight = decay ** rank
    for (const team of lineup.teams)
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) {
          const key = pairKey(team[i]!, team[j]!)
          out.set(key, (out.get(key) ?? 0) + weight)
        }
  })
  return out
}
