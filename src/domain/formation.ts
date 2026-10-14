import type { Player } from './types'

/** Cuánto "tira" un jugador hacia atrás: más defensa/físico → más atrás */
const defensiveness = (p: Player) => p.stats.def + p.stats.fis * 0.5 - p.stats.tir - p.stats.reg * 0.5

/**
 * Coloca al equipo en líneas, de portería hacia delante:
 * [portero, defensas, medios, delanteros]. Las líneas vacías se omiten.
 */
export function formationLines(players: Player[]): Player[][] {
  if (players.length === 0) return []
  const sorted = [...players].sort(
    (a, b) => defensiveness(b) - defensiveness(a) || a.name.localeCompare(b.name),
  )
  const [keeper, ...rest] = sorted
  const m = rest.length
  const base = Math.floor(m / 3)
  const extra = m % 3
  const sizes = [base + (extra > 0 ? 1 : 0), base + (extra > 1 ? 1 : 0), base]
  const lines: Player[][] = [[keeper!]]
  let i = 0
  for (const size of sizes) {
    if (size > 0) lines.push(rest.slice(i, i + size))
    i += size
  }
  return lines
}

/** "2-2-1" para 6 jugadores, etc. (sin contar portero) */
export function formationLabel(players: Player[]): string {
  return formationLines(players)
    .slice(1)
    .map((l) => l.length)
    .join('-')
}
