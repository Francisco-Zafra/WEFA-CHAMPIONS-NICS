import { participants, type Cup } from './cup'
import type { ClubId, Match } from './types'

/**
 * Último capitán de cada club según los partidos guardados (amistosos y cruces de copa
 * con equipos sorteados). Gana el más reciente por fecha; a igual fecha, el guardado después.
 */
export function lastCaptains(matches: Match[], cups: Cup[]): Map<ClubId, string> {
  const events: { club: ClubId; captain: string; date: string; order: number }[] = []
  for (const m of matches) {
    if (m.captainA) events.push({ club: m.clubA, captain: m.captainA, date: m.date, order: m.createdAt })
    if (m.captainB) events.push({ club: m.clubB, captain: m.captainB, date: m.date, order: m.createdAt })
  }
  for (const cup of cups) {
    cup.ties.forEach((t, i) => {
      if (t.teamA.length === 0) return
      const [a, b] = participants(cup, i)
      const date = t.date ?? ''
      if (a && t.captainA) events.push({ club: a, captain: t.captainA, date, order: cup.createdAt + i })
      if (b && t.captainB) events.push({ club: b, captain: t.captainB, date, order: cup.createdAt + i })
    })
  }
  events.sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order)
  const out = new Map<ClubId, string>()
  for (const e of events) out.set(e.club, e.captain)
  return out
}

/** `undefined` = automático (último capitán del club); `null` = sin capitán; id = elegido a mano */
export type CaptainChoice = string | null | undefined

/**
 * Capitanes efectivos del sorteo. Solo valen si están convocados, y el B nunca puede
 * coincidir con el A.
 */
export function resolveCaptains(
  choice: { clubA: ClubId; clubB: ClubId; captainA?: CaptainChoice; captainB?: CaptainChoice },
  selected: Set<string>,
  defaults: Map<ClubId, string>,
): [string | null, string | null] {
  const pick = (explicit: CaptainChoice, club: ClubId, exclude: string | null) => {
    const id = explicit === undefined ? (defaults.get(club) ?? null) : explicit
    return id && selected.has(id) && id !== exclude ? id : null
  }
  const a = pick(choice.captainA, choice.clubA, null)
  const b = pick(choice.captainB, choice.clubB, a)
  return [a, b]
}
