import type { Player } from './types'

/** Cuánto "tira" un jugador hacia atrás: más defensa/físico → más atrás */
const defensiveness = (p: Player) => p.stats.def + p.stats.fis * 0.5 - p.stats.tir - p.stats.reg * 0.5

/**
 * Coloca al equipo en líneas, de portería hacia delante:
 * [portero, defensas, medios, delanteros]. Las líneas vacías se omiten.
 * El capitán, si lo hay, va siempre al frente y en el centro de la línea de delante.
 */
export function formationLines(players: Player[], captain: string | null = null): Player[][] {
  const lines = baseLines(players)
  return captain ? captainToFront(lines, captain) : lines
}

/** Intercambia al capitán con el jugador central de la línea de delante */
function captainToFront(lines: Player[][], captain: string): Player[][] {
  if (lines.length < 2) return lines
  const out = lines.map((l) => [...l])
  const front = out[out.length - 1]!
  const center = Math.floor((front.length - 1) / 2)
  const li = out.findIndex((l) => l.some((p) => p.id === captain))
  if (li === -1) return lines
  const pi = out[li]!.findIndex((p) => p.id === captain)
  if (li === out.length - 1) {
    // Ya está delante: solo lo centramos
    ;[front[pi], front[center]] = [front[center]!, front[pi]!]
    return out
  }
  ;[out[li]![pi], front[center]] = [front[center]!, out[li]![pi]!]
  return out
}

function baseLines(players: Player[]): Player[][] {
  if (players.length === 0) return []
  const sorted = [...players].sort(
    (a, b) => defensiveness(b) - defensiveness(a) || a.name.localeCompare(b.name),
  )
  const [keeper, ...rest] = sorted
  const m = rest.length
  // Pocas líneas para que las cartas del campo no se apilen: hasta 3 jugadores, una línea;
  // hasta 8, dos (la de atrás con el que sobra); más, tres
  const rows = m <= 3 ? 1 : m <= 8 ? 2 : 3
  const sizes = Array.from({ length: rows }, (_, r) => Math.floor(m / rows) + (r < m % rows ? 1 : 0))
  const lines: Player[][] = [[keeper!]]
  let i = 0
  for (const size of sizes) {
    if (size > 0) lines.push(rest.slice(i, i + size))
    i += size
  }
  return lines
}

/** "3-2" para 6 jugadores, etc. (sin contar portero) */
export function formationLabel(players: Player[]): string {
  return formationLines(players)
    .slice(1)
    .map((l) => l.length)
    .join('-')
}

/** Lista con el capitán delante; el resto mantiene su orden */
export function captainFirst<T extends { id: string }>(team: T[], captain: string | null): T[] {
  return [...team].sort((x, y) => Number(y.id === captain) - Number(x.id === captain))
}
