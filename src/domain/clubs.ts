import type { Club, ClubId } from './types'

export const CLUBS: Club[] = [
  {
    id: 'avispas',
    name: 'Avispas F.C.',
    emoji: '🐝',
    primary: '#facc15',
    secondary: '#1c1917',
    ink: '#1c1917',
  },
  {
    id: 'jabalies',
    name: 'C.D. Jabalíes',
    emoji: '🐗',
    primary: '#ef4444',
    secondary: '#d4d4d8',
    ink: '#ffffff',
  },
  {
    id: 'pinguinardos',
    name: 'Pingüinardos',
    emoji: '🐧',
    primary: '#38bdf8',
    secondary: '#f8fafc',
    ink: '#082f49',
  },
  { id: 'beetles', name: 'Beetles', emoji: '🪲', primary: '#4ade80', secondary: '#052e16', ink: '#052e16' },
  {
    id: 'tiburones',
    name: 'TiburOnes F.C.',
    emoji: '🦈',
    primary: '#2dd4bf',
    secondary: '#0c1a2e',
    ink: '#042f2e',
  },
  {
    id: 'pandas',
    name: 'Pandas F.C.',
    emoji: '🐼',
    primary: '#f4f4f5',
    secondary: '#dc2626',
    ink: '#18181b',
  },
  {
    id: 'flamingo',
    name: 'Real Flamingo',
    emoji: '🦩',
    primary: '#f472b6',
    secondary: '#1e0a17',
    ink: '#500724',
  },
  { id: 'patos', name: 'Patos C.F.', emoji: '🦆', primary: '#a3e635', secondary: '#facc15', ink: '#1a2e05' },
]

const BY_ID = new Map(CLUBS.map((c) => [c.id, c]))

export function getClub(id: ClubId): Club {
  const club = BY_ID.get(id)
  if (!club) throw new Error(`Club desconocido: ${id}`)
  return club
}

export function isClubId(value: unknown): value is ClubId {
  return typeof value === 'string' && BY_ID.has(value as ClubId)
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export const badgeUrl = (id: ClubId) => asset(`clubs/${id}.webp`)
export const anthemUrl = (id: ClubId) => asset(`clubs/${id}.mp3`)
