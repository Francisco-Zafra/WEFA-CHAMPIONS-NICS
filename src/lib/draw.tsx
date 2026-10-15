import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BalanceResult, PlayerPair } from '@/domain/balance'
import type { CaptainChoice } from '@/domain/captains'
import type { ClubId } from '@/domain/types'

export interface DrawConfig {
  /** Cambios locales sobre "convocado" (id → incluido). Lo no tocado sigue a player.active */
  overrides: Record<string, boolean>
  clubA: ClubId
  clubB: ClubId
  /** undefined = automático (último capitán del club); null = sin capitán */
  captainA?: CaptainChoice
  captainB?: CaptainChoice
  /** Quién se queda el jugador extra si son impares */
  extraTo: 'A' | 'B'
  together: PlayerPair[]
  apart: PlayerPair[]
  tolerance: number
  /** Evitar repetir equipos y parejas de las últimas alineaciones */
  variety: boolean
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
  /** Reglas aplicadas en el sorteo (solo las de jugadores convocados) */
  rules?: { together: PlayerPair[]; apart: PlayerPair[] }
  /** Es un partido guardado abierto tal cual (no un sorteo nuevo) */
  fromSaved?: boolean
  /** Viene de un partido ya guardado: al guardar se actualiza ese partido */
  savedMatchId?: string
  /** Fecha, hora y campo ya conocidos (para rellenar al guardar) */
  when?: { date: string; time: string | null; place: string | null }
  /** Reparto del sorteo antes de retocarlo a mano (para deshacer) */
  original?: Pick<Draw, 'result' | 'captainA' | 'captainB'>
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
}

const DEFAULT_CONFIG: DrawConfig = {
  overrides: {},
  clubA: 'flamingo',
  clubB: 'tiburones',
  extraTo: 'A',
  together: [],
  apart: [],
  tolerance: 1,
  variety: true,
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
          config: {
            ...friendly,
            clubA: ref.clubA,
            clubB: ref.clubB,
            captainA: undefined,
            captainB: undefined,
          },
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
