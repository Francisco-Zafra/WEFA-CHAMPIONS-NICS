import seed from '../../scripts/seed/players.json'
import { overall } from './rating'
import type { Player } from './types'

/** Los 27 jugadores reales migrados de FTB2.0 */
export const SEED_PLAYERS: Player[] = seed.map((p) => ({
  id: `legacy-${p.legacyId}`,
  name: p.name,
  rating: Math.round(overall(p.stats)),
  stats: p.stats,
  active: p.active,
}))
