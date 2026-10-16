import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Cup } from '@/domain/cup'
import { applyFilter, filterChips, type ChipNames, type StatsFilter } from '@/domain/filters'
import { isPlayed } from '@/domain/standings'
import type { Match, Player } from '@/domain/types'
import { useStatsFilter } from '@/lib/statsFilter'

export interface StatsData {
  filter: StatsFilter
  setFilter: (f: StatsFilter) => void
  /** Partidos jugados que cumplen el filtro */
  filtered: Match[]
  /** Partidos jugados en total */
  total: number
  chips: ReturnType<typeof filterChips>
  names: ChipNames
  /** Nombre actual de cada jugador (por si se ha renombrado) */
  nameMap: Map<string, string>
  now: Date
}

/** Partidos de Estadísticas con el filtro activo aplicado */
export function useStatsData(matches: Match[], players: Player[], cups: Cup[]): StatsData {
  const { filter, setFilter } = useStatsFilter()
  return useMemo(() => {
    const now = new Date()
    const nameMap = new Map(players.map((p) => [p.id, p.name]))
    const snapshot = new Map(matches.flatMap((m) => [...m.teamA, ...m.teamB]).map((p) => [p.id, p.name]))
    const names: ChipNames = {
      player: (id) => nameMap.get(id) ?? snapshot.get(id) ?? '¿?',
      cup: (id) => cups.find((c) => c.id === id)?.name ?? 'Copa',
    }
    return {
      filter,
      setFilter,
      filtered: applyFilter(matches, filter, now),
      total: matches.filter(isPlayed).length,
      chips: filterChips(filter, names),
      names,
      nameMap,
      now,
    }
  }, [matches, players, cups, filter, setFilter])
}

/** Abre el historial con solo esos partidos (lo que hay detrás de una cifra) */
export function useShowMatches() {
  const navigate = useNavigate()
  return (matches: Match[], title: string) =>
    navigate('/historial', { state: { ids: matches.map((m) => m.id), title } })
}
