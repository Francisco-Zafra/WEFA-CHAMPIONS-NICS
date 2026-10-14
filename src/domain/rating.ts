import { STAT_KEYS, type Player, type Stats } from './types'

/** Media de las 6 stats con 2 decimales (mismo cálculo que FTB2.0) */
export function overall(stats: Stats): number {
  const sum = STAT_KEYS.reduce((acc, k) => acc + stats[k], 0)
  return Math.round((sum / STAT_KEYS.length) * 100) / 100
}

export type Tier = 'gold' | 'silver' | 'bronze'

/** Oro desde 85, plata desde 75 (sobre la media redondeada que muestra la carta) */
export function tier(rating: number): Tier {
  rating = Math.round(rating)
  if (rating >= 85) return 'gold'
  if (rating >= 75) return 'silver'
  return 'bronze'
}

export const TIER_LABELS: Record<Tier, string> = {
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
  return players.reduce((acc, p) => acc + p.rating, 0) / players.length
}

/** Media válida: entero de 1 a 99 */
export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(99, Math.round(value)))
}

export function clampStat(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(99, Math.round(value)))
}

/** 86,0 · formato español con decimales fijos */
export function fmt(value: number, decimals = 1): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Equilibrio 0–100 a partir de la diferencia de medias (0 → 100 %, 10 puntos → 0 %) */
export function balancePct(ratingDiff: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - ratingDiff * 10)))
}

/** Iniciales para monogramas: «Riccardo's Boyfriend» → RB, «Guti» → GU */
export function initials(name: string): string {
  const words = name
    .replace(/['’]s\b/gi, '')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length > 1) return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
  return (words[0] ?? '?').slice(0, 2).toUpperCase()
}

/** Escala ampliada alrededor de los valores para que se vean las diferencias */
export function statScale(a: Stats, b: Stats): [number, number] {
  const values = STAT_KEYS.flatMap((k) => [a[k], b[k]])
  let lo = Math.floor((Math.min(...values) - 2) / 5) * 5
  let hi = Math.ceil((Math.max(...values) + 1) / 5) * 5
  if (hi - lo < 10) lo = hi - 10
  lo = Math.max(0, lo)
  hi = Math.min(100, Math.max(hi, lo + 10))
  return [lo, hi]
}
