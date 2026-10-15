import { rebalance } from '@/domain/balance'
import type { UpcomingMatch } from '@/domain/nextMatch'
import type { MatchPlayer, Player } from '@/domain/types'
import type { CupTieRef, Draw, DrawConfig } from './draw'
import { runDraw } from './runDraw'

/** Jugadores del partido con sus datos actuales (si alguno ya no existe, se reconstruye de la instantánea) */
export function teamPlayers(team: MatchPlayer[], players: Player[]): Player[] {
  return team.map((mp) => {
    const p = players.find((x) => x.id === mp.id)
    if (p) return p
    const r = Math.round(mp.rating)
    return {
      id: mp.id,
      name: mp.name,
      rating: r,
      active: false,
      avatar: null,
      stats: { rit: r, tir: r, pas: r, reg: r, def: r, fis: r },
    }
  })
}

export function cupRefOf(up: UpcomingMatch): CupTieRef | null {
  if (up.kind !== 'cup' || !up.cupId || up.tie === undefined) return null
  return { cupId: up.cupId, cupName: up.cupName ?? 'Copa', tie: up.tie, clubA: up.clubA, clubB: up.clubB }
}

const savedBits = (up: UpcomingMatch) => ({
  cup: cupRefOf(up),
  savedMatchId: up.matchId,
  when: { date: up.date, time: up.time, place: up.place },
})

/** El partido guardado, tal cual, para verlo en la pizarra */
export function drawFromUpcoming(up: UpcomingMatch, players: Player[], tolerance: number): Draw {
  const teamA = teamPlayers(up.teamA, players)
  const teamB = teamPlayers(up.teamB, players)
  return {
    result: rebalance(teamA, teamB, tolerance, { candidates: 0, method: 'exhaustive' }),
    clubA: up.clubA,
    clubB: up.clubB,
    captainA: up.captainA,
    captainB: up.captainB,
    tolerance,
    seed: up.kickoff.getTime(),
    at: up.kickoff.getTime(),
    fromSaved: true,
    ...savedBits(up),
  }
}

/** Vuelve a sortear con los mismos jugadores, clubes y capitanes; al guardar actualiza ese partido */
export function redrawUpcoming(
  up: UpcomingMatch,
  players: Player[],
  base: DrawConfig,
  pairs: Map<string, number> = new Map(),
): { ok: true; draw: Draw } | { ok: false; error: string } {
  const ids = new Set([...up.teamA, ...up.teamB].map((p) => p.id))
  const config: DrawConfig = {
    ...base,
    overrides: Object.fromEntries(players.map((p) => [p.id, ids.has(p.id)])),
    clubA: up.clubA,
    clubB: up.clubB,
    captainA: up.captainA,
    captainB: up.captainB,
    extraTo: up.teamA.length >= up.teamB.length ? 'A' : 'B',
  }
  const out = runDraw(players, config, cupRefOf(up), undefined, pairs)
  if (!out.ok) return out
  return { ok: true, draw: { ...out.draw, ...savedBits(up) } }
}
