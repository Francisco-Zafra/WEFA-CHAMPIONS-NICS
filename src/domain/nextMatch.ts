import { participants, type Cup } from './cup'
import type { ClubId, Match, MatchPlayer } from './types'

/** Hora por defecto si un partido no la tiene */
export const DEFAULT_TIME = '21:00'

/** Partido pendiente (sin resultado): un amistoso guardado o un cruce de copa con equipos */
export interface UpcomingMatch {
  kind: 'match' | 'cup'
  /** Id del partido (amistoso) */
  matchId?: string
  cupId?: string
  cupName?: string
  tie?: number
  clubA: ClubId
  clubB: ClubId
  captainA: string | null
  captainB: string | null
  teamA: MatchPlayer[]
  teamB: MatchPlayer[]
  /** YYYY-MM-DD */
  date: string
  /** HH:MM o null */
  time: string | null
  place: string | null
  /** Saque inicial (hora local); si falta la hora se usa DEFAULT_TIME */
  kickoff: Date
}

export function kickoffOf(date: string, time: string | null): Date {
  return new Date(`${date}T${time ?? DEFAULT_TIME}:00`)
}

export function pendingMatches(matches: Match[], cups: Cup[]): UpcomingMatch[] {
  const out: UpcomingMatch[] = []
  for (const m of matches) {
    if (m.scoreA !== null && m.scoreB !== null) continue
    if (!m.date) continue
    out.push({
      kind: 'match',
      matchId: m.id,
      clubA: m.clubA,
      clubB: m.clubB,
      captainA: m.captainA,
      captainB: m.captainB,
      teamA: m.teamA,
      teamB: m.teamB,
      date: m.date,
      time: m.time,
      place: m.place,
      kickoff: kickoffOf(m.date, m.time),
    })
  }
  for (const cup of cups) {
    cup.ties.forEach((t, i) => {
      if (t.winner || t.teamA.length === 0 || !t.date) return
      const [a, b] = participants(cup, i)
      if (!a || !b) return
      out.push({
        kind: 'cup',
        cupId: cup.id,
        cupName: cup.name,
        tie: i,
        clubA: a,
        clubB: b,
        captainA: t.captainA,
        captainB: t.captainB,
        teamA: t.teamA,
        teamB: t.teamB,
        date: t.date,
        time: t.time,
        place: t.place,
        kickoff: kickoffOf(t.date, t.time),
      })
    })
  }
  return out.sort((x, y) => x.kickoff.getTime() - y.kickoff.getTime())
}

/** Margen tras el saque inicial durante el que el partido sigue siendo «el próximo» (se está jugando) */
const LIVE_MS = 3 * 60 * 60 * 1000

/**
 * El próximo partido: el pendiente más cercano que no haya empezado hace más de 3 h.
 * Si todos los pendientes son antiguos (falta poner el resultado), el más reciente.
 */
export function nextMatch(matches: Match[], cups: Cup[], now = new Date()): UpcomingMatch | null {
  const pending = pendingMatches(matches, cups)
  const upcoming = pending.find((m) => m.kickoff.getTime() + LIVE_MS >= now.getTime())
  return upcoming ?? pending[pending.length - 1] ?? null
}

/** Campo del último partido guardado (amistoso o cruce de copa) que lo tenga */
export function lastPlace(matches: Match[], cups: Cup[]): string | null {
  const entries: { place: string; date: string; order: number }[] = []
  for (const m of matches) if (m.place) entries.push({ place: m.place, date: m.date, order: m.createdAt })
  for (const cup of cups)
    cup.ties.forEach((t, i) => {
      if (t.place) entries.push({ place: t.place, date: t.date ?? '', order: cup.createdAt + i })
    })
  entries.sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order)
  return entries[entries.length - 1]?.place ?? null
}

export interface Duel {
  date: string
  /** Goles desde el punto de vista de (clubA, clubB) pedidos */
  goalsA: number
  goalsB: number
}

/** Último partido jugado entre dos clubes (en cualquier orden), amistoso o de copa */
export function lastDuel(matches: Match[], cups: Cup[], clubA: ClubId, clubB: ClubId): Duel | null {
  const duels: (Duel & { order: number })[] = []
  const add = (a: ClubId, b: ClubId, sa: number, sb: number, date: string, order: number) => {
    if (a === clubA && b === clubB) duels.push({ date, goalsA: sa, goalsB: sb, order })
    else if (a === clubB && b === clubA) duels.push({ date, goalsA: sb, goalsB: sa, order })
  }
  for (const m of matches)
    if (m.scoreA !== null && m.scoreB !== null) add(m.clubA, m.clubB, m.scoreA, m.scoreB, m.date, m.createdAt)
  for (const cup of cups)
    cup.ties.forEach((t, i) => {
      if (t.scoreA === null || t.scoreB === null || !t.winner) return
      const [a, b] = participants(cup, i)
      if (a && b) add(a, b, t.scoreA, t.scoreB, t.date ?? '', cup.createdAt + i)
    })
  duels.sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order)
  const last = duels[duels.length - 1]
  return last ? { date: last.date, goalsA: last.goalsA, goalsB: last.goalsB } : null
}

/** Días, horas, minutos y segundos que faltan (0 si ya ha empezado) */
export function countdown(kickoff: Date, now: number) {
  const t = Math.max(0, Math.floor((kickoff.getTime() - now) / 1000))
  return {
    days: Math.floor(t / 86400),
    hours: Math.floor(t / 3600) % 24,
    minutes: Math.floor(t / 60) % 60,
    seconds: t % 60,
    started: t === 0,
  }
}
