import { STAT_KEYS, type Player, type Stats } from './types'

/** Media de las 6 stats con 2 decimales (mismo cálculo que FTB2.0) */
export function overall(stats: Stats): number {
  const sum = STAT_KEYS.reduce((acc, k) => acc + stats[k], 0)
  return Math.round((sum / STAT_KEYS.length) * 100) / 100
}

export type Tier = 'icon' | 'gold' | 'silver' | 'bronze'

export function tier(rating: number): Tier {
  if (rating >= 90) return 'icon'
  if (rating >= 85) return 'gold'
  if (rating >= 75) return 'silver'
  return 'bronze'
}

export const TIER_LABELS: Record<Tier, string> = {
  icon: 'Icono',
  gold: 'Oro',
  silver: 'Plata',
  bronze: 'Bronce',
}

export function averageStats(players: Player[]): Stats {
  const out = { rit: 0, tir: 0, pas: 0, reg: 0, def: 0, fis: 0 }
  if (players.length === 0) return out
  for (const p of players) for (const k of STAT_KEYS) out[k] += p.stats[k]
  for (const k of STAT_KEYS) out[k] = Math.round((out[k] / players.length) * 10) / 10
  return out
}

export function averageRating(players: Player[]): number {
  if (players.length === 0) return 0
  return players.reduce((acc, p) => acc + overall(p.stats), 0) / players.length
}

export function clampStat(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(99, Math.round(value)))
}
