import type { Club, ClubId } from './types'

export const CLUBS: Club[] = [
  {
    id: 'avispas',
    name: 'Avispas F.C.',
    short: 'Avispas',
    primary: '#FFC21A',
    ink: '#161004',
    deep: '#5E4300',
  },
  {
    id: 'jabalies',
    name: 'C.D. Jabalíes',
    short: 'Jabalíes',
    primary: '#FF6A2B',
    ink: '#1C0802',
    deep: '#5E1F06',
  },
  {
    id: 'pinguinardos',
    name: 'Pingüinardos',
    short: 'Pingüinar.',
    primary: '#3AB0FF',
    ink: '#03121F',
    deep: '#0B3A66',
  },
  { id: 'beetles', name: 'Beetles', short: 'Beetles', primary: '#3BE36B', ink: '#03150A', deep: '#0E5A2B' },
  {
    id: 'tiburones',
    name: 'TiburOnes',
    short: 'TiburOnes',
    primary: '#22D3CF',
    ink: '#021716',
    deep: '#0A3A4A',
  },
  { id: 'pandas', name: 'Pandas F.C.', short: 'Pandas', primary: '#F0233A', ink: '#FFFFFF', deep: '#4A0710' },
  {
    id: 'flamingo',
    name: 'Real Flamingo',
    short: 'Flamingo',
    primary: '#FF4FB0',
    ink: '#1F0612',
    deep: '#5A0F36',
  },
  { id: 'patos', name: 'Patos C.F.', short: 'Patos', primary: '#D7F23A', ink: '#121604', deep: '#3F5A10' },
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
