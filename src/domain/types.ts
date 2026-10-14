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
  stats: Stats
  /** Convocado: entra por defecto en el sorteo */
  active: boolean
}

export type PlayerInput = Omit<Player, 'id'>

export type ClubId =
  'avispas' | 'jabalies' | 'pinguinardos' | 'beetles' | 'tiburones' | 'pandas' | 'flamingo' | 'patos'

export interface Club {
  id: ClubId
  name: string
  emoji: string
  /** Color principal (acento) y secundario, sacados del escudo */
  primary: string
  secondary: string
  /** Color de texto legible sobre `primary` */
  ink: string
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
