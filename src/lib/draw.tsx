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
  tolerance: number
  seed: number
  /** Fecha del sorteo (ms) */
  at: number
}

export type DrawStep = 1 | 2 | 3

interface DrawState {
  config: DrawConfig
  setConfig: (update: (c: DrawConfig) => DrawConfig) => void
  step: DrawStep
  setStep: (s: DrawStep) => void
  draw: Draw | null
  setDraw: (d: Draw | null) => void
  /** Ceremonia de revelación en curso */
  revealing: boolean
  setRevealing: (v: boolean) => void
  /** Club que tiñe la interfaz (--club): el equipo A del sorteo actual */
  themeClub: ClubId
}

const DEFAULT_CONFIG: DrawConfig = {
  overrides: {},
  clubA: 'flamingo',
  clubB: 'tiburones',
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
  const [step, setStep] = useState<DrawStep>(1)
  const [draw, setDraw] = useState<Draw | null>(null)
  const [revealing, setRevealing] = useState(false)
  const value = useMemo<DrawState>(
    () => ({
      config,
      setConfig: (update) => setConfigState(update),
      step,
      setStep,
      draw,
      setDraw,
      revealing,
      setRevealing,
      themeClub: draw?.clubA ?? config.clubA,
    }),
    [config, step, draw, revealing],
  )
  return <DrawContext.Provider value={value}>{children}</DrawContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDraw(): DrawState {
  const ctx = useContext(DrawContext)
  if (!ctx) throw new Error('useDraw fuera de DrawProvider')
  return ctx
}
