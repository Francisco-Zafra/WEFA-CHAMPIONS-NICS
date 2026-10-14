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

/** Cruce de copa que se está sorteando */
export interface CupTieRef {
  cupId: string
  cupName: string
  tie: number
  clubA: ClubId
  clubB: ClubId
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
  /** Si es un partido de copa, a qué cruce pertenece; null = amistoso */
  cup: CupTieRef | null
}

export type DrawStep = 1 | 2 | 3
export type DrawMode = 'friendly' | 'cup'

interface DrawState {
  /** Configuración del modo activo (amistoso o copa) */
  config: DrawConfig
  setConfig: (update: (c: DrawConfig) => DrawConfig) => void
  step: DrawStep
  setStep: (s: DrawStep) => void
  mode: DrawMode
  setMode: (m: DrawMode) => void
  /** Cruce de copa del modo activo; null en amistoso */
  cupTie: CupTieRef | null
  /** Último cruce de copa elegido, aunque ahora se esté en amistoso */
  pendingCupTie: CupTieRef | null
  /** Entra en modo copa para un cruce (clubes fijos, sin tocar el amistoso) */
  startCup: (ref: CupTieRef) => void
  /** Olvida el cruce de copa y vuelve a amistoso */
  clearCup: () => void
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
  const [friendly, setFriendly] = useState(DEFAULT_CONFIG)
  const [cup, setCup] = useState<{ ref: CupTieRef; config: DrawConfig } | null>(null)
  const [mode, setMode] = useState<DrawMode>('friendly')
  const [step, setStep] = useState<DrawStep>(1)
  const [draw, setDraw] = useState<Draw | null>(null)
  const [revealing, setRevealing] = useState(false)

  const value = useMemo<DrawState>(() => {
    const inCup = mode === 'cup' && cup !== null
    const config = inCup ? cup.config : friendly
    return {
      config,
      setConfig: (update) =>
        inCup ? setCup((c) => c && { ...c, config: update(c.config) }) : setFriendly(update),
      step,
      setStep,
      mode: inCup ? 'cup' : 'friendly',
      setMode: (m) => {
        setMode(m)
        setStep(1)
      },
      cupTie: inCup ? cup.ref : null,
      pendingCupTie: cup?.ref ?? null,
      startCup: (ref) => {
        setCup({
          ref,
          // Convocados y reglas del amistoso como punto de partida; clubes los del cruce
          config: { ...friendly, clubA: ref.clubA, clubB: ref.clubB, captainA: null, captainB: null },
        })
        setMode('cup')
        setStep(1)
      },
      clearCup: () => {
        setCup(null)
        setMode('friendly')
      },
      draw,
      setDraw,
      revealing,
      setRevealing,
      themeClub: draw?.clubA ?? config.clubA,
    }
  }, [friendly, cup, mode, step, draw, revealing])

  return <DrawContext.Provider value={value}>{children}</DrawContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDraw(): DrawState {
  const ctx = useContext(DrawContext)
  if (!ctx) throw new Error('useDraw fuera de DrawProvider')
  return ctx
}
