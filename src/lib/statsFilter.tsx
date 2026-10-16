import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultFilter, type StatsFilter } from '@/domain/filters'

const KEY = 'wefa:stats-filter'

interface FilterState {
  filter: StatsFilter
  setFilter: (f: StatsFilter) => void
  /** Panel de filtros abierto (escritorio) */
  panel: boolean
  setPanel: (open: boolean) => void
}

const FilterContext = createContext<FilterState | null>(null)

function load(): StatsFilter {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return { ...defaultFilter(new Date()), ...(JSON.parse(raw) as Partial<StatsFilter>) }
  } catch {
    // Sin almacenamiento (modo privado…): se empieza con el filtro de siempre
  }
  return defaultFilter(new Date())
}

/** Filtro de Estadísticas: el mismo en todas las secciones y en la ficha del jugador */
export function StatsFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState(load)
  const [panel, setPanel] = useState(false)
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(filter))
    } catch {
      // No pasa nada si no se puede guardar
    }
  }, [filter])
  const value = useMemo(() => ({ filter, setFilter, panel, setPanel }), [filter, panel])
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStatsFilter(): FilterState {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useStatsFilter fuera de StatsFilterProvider')
  return ctx
}
