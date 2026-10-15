import { balanceTeams, type BalanceError } from '@/domain/balance'
import { resolveCaptains } from '@/domain/captains'
import { randomSeed } from '@/domain/rng'
import type { ClubId, Player } from '@/domain/types'
import type { CupTieRef, Draw, DrawConfig } from './draw'

export const DRAW_ERRORS: Record<BalanceError, string> = {
  'not-enough-players': 'Necesitas al menos 2 convocados.',
  'invalid-size': 'Tamaños de equipo imposibles.',
  'impossible-constraints': 'Capitanes y reglas se contradicen: no hay forma de cumplirlas todas.',
}

/** Convocados efectivos: lo tocado en el sorteo manda; si no, lo que diga la plantilla */
export function selectionOf(players: Player[], config: DrawConfig): Player[] {
  return players.filter((p) => config.overrides[p.id] ?? p.active)
}

export function teamSizes(n: number, extraTo: 'A' | 'B'): [number, number] {
  const big = Math.ceil(n / 2)
  const small = Math.floor(n / 2)
  return extraTo === 'A' ? [big, small] : [small, big]
}

export function runDraw(
  players: Player[],
  config: DrawConfig,
  cup: CupTieRef | null = null,
  /** Último capitán de cada club, para los capitanes en automático */
  captainDefaults: Map<ClubId, string> = new Map(),
  /** Coincidencias recientes entre jugadores, para la variedad */
  pairs: Map<string, number> = new Map(),
): { ok: true; draw: Draw } | { ok: false; error: string } {
  const selection = selectionOf(players, config)
  const [sizeA] = teamSizes(selection.length, config.extraTo)
  const inSel = new Set(selection.map((p) => p.id))
  const [captainA, captainB] = resolveCaptains(config, inSel, captainDefaults)
  const seed = randomSeed()
  const outcome = balanceTeams({
    players: selection,
    sizeA,
    captainA,
    captainB,
    together: config.together,
    apart: config.apart,
    tolerance: config.tolerance,
    seed,
    variety: config.variety ? 1 : 0,
    history: pairs,
  })
  if (!outcome.ok) return { ok: false, error: DRAW_ERRORS[outcome.error] }
  return {
    ok: true,
    draw: {
      result: outcome.result,
      clubA: config.clubA,
      clubB: config.clubB,
      captainA,
      captainB,
      tolerance: config.tolerance,
      seed,
      at: Date.now(),
      cup,
      rules: {
        together: config.together.filter(([x, y]) => inSel.has(x) && inSel.has(y)),
        apart: config.apart.filter(([x, y]) => inSel.has(x) && inSel.has(y)),
      },
    },
  }
}
