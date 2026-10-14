import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { isClubId } from '@/domain/clubs'
import { emptyTie, TIE_COUNT, type Cup, type CupInput, type CupTie } from '@/domain/cup'
import { clampStat } from '@/domain/rating'
import {
  STAT_KEYS,
  type Match,
  type MatchInput,
  type Player,
  type PlayerInput,
  type Stats,
} from '@/domain/types'
import { db } from './firebase'

const players = collection(db, 'players')
const matches = collection(db, 'matches')
const cups = collection(db, 'cups')

// ---------- Conversión segura desde Firestore ----------

function toStats(raw: unknown): Stats {
  const src = (raw ?? {}) as Record<string, unknown>
  return Object.fromEntries(STAT_KEYS.map((k) => [k, clampStat(Number(src[k] ?? 0))])) as Stats
}

function toPlayer(id: string, d: DocumentData): Player {
  return { id, name: String(d.name ?? ''), stats: toStats(d.stats), active: Boolean(d.active) }
}

function toMatch(id: string, d: DocumentData): Match | null {
  if (!isClubId(d.clubA) || !isClubId(d.clubB)) return null
  const team = (raw: unknown) =>
    Array.isArray(raw)
      ? raw.map((p) => ({ id: String(p.id), name: String(p.name), rating: Number(p.rating) || 0 }))
      : []
  const score = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    id,
    date: String(d.date ?? ''),
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now(),
    clubA: d.clubA,
    clubB: d.clubB,
    captainA: d.captainA ?? null,
    captainB: d.captainB ?? null,
    teamA: team(d.teamA),
    teamB: team(d.teamB),
    scoreA: score(d.scoreA),
    scoreB: score(d.scoreB),
    mvp: d.mvp ?? null,
  }
}

const toTeam = (raw: unknown) =>
  Array.isArray(raw)
    ? raw.map((p) => ({ id: String(p.id), name: String(p.name), rating: Number(p.rating) || 0 }))
    : []

const toScore = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function toCup(id: string, d: DocumentData): Cup | null {
  const seeds = Array.isArray(d.seeds) ? d.seeds.filter(isClubId) : []
  if (seeds.length !== 8) return null
  const raw: unknown[] = Array.isArray(d.ties) ? d.ties : []
  const ties: CupTie[] = Array.from({ length: TIE_COUNT }, (_, i) => {
    const t = (raw[i] ?? {}) as Record<string, unknown>
    return {
      ...emptyTie(),
      scoreA: toScore(t.scoreA),
      scoreB: toScore(t.scoreB),
      winner: isClubId(t.winner) ? t.winner : null,
      date: typeof t.date === 'string' ? t.date : null,
      teamA: toTeam(t.teamA),
      teamB: toTeam(t.teamB),
      captainA: typeof t.captainA === 'string' ? t.captainA : null,
      captainB: typeof t.captainB === 'string' ? t.captainB : null,
    }
  })
  return {
    id,
    name: String(d.name ?? 'Copa'),
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now(),
    seeds,
    ties,
  }
}

// ---------- Suscripciones en tiempo real ----------

export interface Collection<T> {
  data: T[]
  loading: boolean
  error: Error | null
}

function useCollection<T>(
  subscribe: (onData: (d: T[]) => void, onError: (e: Error) => void) => () => void,
): Collection<T> {
  const [state, setState] = useState<Collection<T>>({ data: [], loading: true, error: null })
  useEffect(
    () =>
      subscribe(
        (data) => setState({ data, loading: false, error: null }),
        (error) => setState((s) => ({ ...s, loading: false, error })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  return state
}

export function usePlayers(): Collection<Player> {
  return useCollection((onData, onError) =>
    onSnapshot(
      players,
      (snap) =>
        onData(
          snap.docs.map((d) => toPlayer(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name, 'es')),
        ),
      onError,
    ),
  )
}

export function useMatches(): Collection<Match> {
  return useCollection((onData, onError) =>
    onSnapshot(
      matches,
      (snap) =>
        onData(
          snap.docs
            .map((d) => toMatch(d.id, d.data()))
            .filter((m): m is Match => m !== null)
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
        ),
      onError,
    ),
  )
}

// ---------- Escrituras (solo admin, lo impone firestore.rules) ----------

export function createPlayer(input: PlayerInput) {
  return addDoc(players, { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export function updatePlayer(id: string, input: Partial<PlayerInput>) {
  return updateDoc(doc(players, id), { ...input, updatedAt: serverTimestamp() })
}

export function deletePlayer(id: string) {
  return deleteDoc(doc(players, id))
}

export async function setPlayersActive(ids: string[], active: boolean) {
  const batch = writeBatch(db)
  for (const id of ids) batch.update(doc(players, id), { active, updatedAt: serverTimestamp() })
  await batch.commit()
}

export function createMatch(input: MatchInput) {
  return addDoc(matches, { ...input, createdAt: serverTimestamp() })
}

export function updateMatch(id: string, input: Partial<MatchInput>) {
  return updateDoc(doc(matches, id), input)
}

export function deleteMatch(id: string) {
  return deleteDoc(doc(matches, id))
}

export function useCups(): Collection<Cup> {
  return useCollection((onData, onError) =>
    onSnapshot(
      cups,
      (snap) =>
        onData(
          snap.docs
            .map((d) => toCup(d.id, d.data()))
            .filter((c): c is Cup => c !== null)
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      onError,
    ),
  )
}

export async function createCup(input: CupInput): Promise<string> {
  const ref = await addDoc(cups, { ...input, createdAt: serverTimestamp() })
  return ref.id
}

export function updateCup(id: string, input: Partial<CupInput>) {
  return updateDoc(doc(cups, id), input)
}

export function deleteCup(id: string) {
  return deleteDoc(doc(cups, id))
}
