import { isPlayed } from './standings'
import type { Match } from './types'

/** Horas que la votación del MVP queda abierta tras apuntar el resultado */
export const VOTING_HOURS = 72
export const VOTING_MS = VOTING_HOURS * 60 * 60 * 1000

export interface Vote {
  /** `${matchId}_${uid}`: un voto por partido y navegador */
  id: string
  matchId: string
  uid: string
  playerId: string
  at: number
}

export type VotingStatus = 'none' | 'open' | 'closed'

/** Cierre automático: 72 h tras apuntar el resultado (null si el partido no admite votación) */
export function votingDeadline(m: Match): number | null {
  return isPlayed(m) && m.resultAt ? m.resultAt + VOTING_MS : null
}

/**
 * none: sin resultado (o resultado de antes de existir la votación);
 * open: se puede votar; closed: cerrada por el admin o pasadas 72 h
 */
export function votingStatus(m: Match, now: number): VotingStatus {
  const deadline = votingDeadline(m)
  if (deadline === null) return 'none'
  return m.votingClosed || now >= deadline ? 'closed' : 'open'
}

export interface TallyRow {
  playerId: string
  votes: number
}

/** Votos por jugador de un partido, de más a menos */
export function tally(votes: Vote[], matchId: string): TallyRow[] {
  const map = new Map<string, number>()
  for (const v of votes) if (v.matchId === matchId) map.set(v.playerId, (map.get(v.playerId) ?? 0) + 1)
  return [...map.entries()]
    .map(([playerId, n]) => ({ playerId, votes: n }))
    .sort((a, b) => b.votes - a.votes || a.playerId.localeCompare(b.playerId))
}

/** Los más votados (varios si hay empate); vacío si nadie ha votado */
export function leaders(rows: TallyRow[]): string[] {
  const top = rows[0]?.votes ?? 0
  return top === 0 ? [] : rows.filter((r) => r.votes === top).map((r) => r.playerId)
}

/** El MVP fijado por el admin o, con la votación cerrada, el único más votado */
export function resolvedMvp(m: Match, votes: Vote[], now: number): string | null {
  if (m.mvp) return m.mvp
  if (votingStatus(m, now) !== 'closed') return null
  const top = leaders(tally(votes, m.id))
  return top.length === 1 ? top[0]! : null
}

/** Partidos con el MVP rellenado a partir de los votos (para estadísticas y fichas) */
export function withResolvedMvp(matches: Match[], votes: Vote[], now: number): Match[] {
  return matches.map((m) => {
    const mvp = resolvedMvp(m, votes, now)
    return mvp === m.mvp ? m : { ...m, mvp }
  })
}

/** Texto del tiempo que queda: «2 d 5 h», «3 h 20 min», «menos de 1 min» */
export function timeLeft(deadline: number, now: number): string {
  const min = Math.max(0, Math.floor((deadline - now) / 60000))
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${m} min`
  return m > 0 ? `${m} min` : 'menos de 1 min'
}
