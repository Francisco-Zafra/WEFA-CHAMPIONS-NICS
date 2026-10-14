import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BalanceResult, PlayerPair } from '@/domain/balance'
import type { ClubId } from '@/domain/types'

export interface DrawConfig {
  /** Cambios locales sobre "convocado" (id → incluido). Lo no tocado sigue a player.active */
  overrides: Record<string, boolean>
  clubA: ClubId
  clubB: ClubId
  captainA: string | null
  captainB: string | null
  /** Quién se queda el jugador extra si son impares */
  extraTo: 'A' | 'B'
  together: PlayerPair[]
  apart: PlayerPair[]
  tolerance: number
}

export interface Draw {
  result: BalanceResult
  clubA: ClubId
  clubB: ClubId
  captainA: string | null
  captainB: string | null
  seed: number
}

interface DrawState {
  config: DrawConfig
  setConfig: (update: (c: DrawConfig) => DrawConfig) => void
  draw: Draw | null
  setDraw: (d: Draw | null) => void
}

const DEFAULT_CONFIG: DrawConfig = {
  overrides: {},
  clubA: 'avispas',
  clubB: 'jabalies',
  captainA: null,
  captainB: null,
  extraTo: 'A',
  together: [],
  apart: [],
  tolerance: 1,
}

const DrawContext = createContext<DrawState | null>(null)

/** Mantiene el sorteo vivo al navegar entre pestañas */
export function DrawProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState(DEFAULT_CONFIG)
  const [draw, setDraw] = useState<Draw | null>(null)
  const value = useMemo<DrawState>(
    () => ({ config, setConfig: (update) => setConfigState(update), draw, setDraw }),
    [config, draw],
  )
  return <DrawContext.Provider value={value}>{children}</DrawContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDraw(): DrawState {
  const ctx = useContext(DrawContext)
  if (!ctx) throw new Error('useDraw fuera de DrawProvider')
  return ctx
}
