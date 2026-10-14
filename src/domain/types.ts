import type { AvatarId } from './avatars'

export const STAT_KEYS = ['rit', 'tir', 'pas', 'reg', 'def', 'fis'] as const
export type StatKey = (typeof STAT_KEYS)[number]
export type Stats = Record<StatKey, number>

export const STAT_LABELS: Record<StatKey, string> = {
  rit: 'RIT',
  tir: 'TIR',
  pas: 'PAS',
  reg: 'REG',
  def: 'DEF',
  fis: 'FÍS',
}

export const STAT_NAMES: Record<StatKey, string> = {
  rit: 'Ritmo',
  tir: 'Tiro',
  pas: 'Pase',
  reg: 'Regate',
  def: 'Defensa',
  fis: 'Físico',
}

export interface Player {
  id: string
  name: string
  /** Media del jugador, puesta a mano. Es la que cuenta para todo (reparto, equipos, categoría) */
  rating: number
  /** Atributos decorativos: se muestran en la carta y la comparativa, pero no cuentan */
  stats: Stats
  /** Avatar predefinido (public/avatars); null = sin avatar */
  avatar: AvatarId | null
  /** Convocado: entra por defecto en el sorteo */
  active: boolean
}

export type PlayerInput = Omit<Player, 'id'>

export type ClubId =
  'avispas' | 'jabalies' | 'pinguinardos' | 'beetles' | 'tiburones' | 'pandas' | 'flamingo' | 'patos'

export interface Club {
  id: ClubId
  name: string
  /** Nombre corto para selectores */
  short: string
  /** Color del club (acento), sacado del escudo; igual que .club-<id> en index.css */
  primary: string
  /** Color de texto legible sobre `primary` */
  ink: string
  /** Variante oscura para fondos */
  deep: string
}

/** Instantánea de un jugador en el momento del partido */
export interface MatchPlayer {
  id: string
  name: string
  rating: number
}

export interface Match {
  id: string
  /** Fecha del partido, YYYY-MM-DD */
  date: string
  /** Hora del saque inicial, HH:MM */
  time: string | null
  /** Campo donde se juega */
  place: string | null
  createdAt: number
  clubA: ClubId
  clubB: ClubId
  captainA: string | null
  captainB: string | null
  teamA: MatchPlayer[]
  teamB: MatchPlayer[]
  scoreA: number | null
  scoreB: number | null
  mvp: string | null
}

export type MatchInput = Omit<Match, 'id' | 'createdAt'>
