import { Crown, Search, X, Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Sheet } from '@/components/Sheet'
import { Crest } from '@/components/ui'
import { getClub } from '@/domain/clubs'
import { fmt } from '@/domain/rating'
import type { ClubId, MatchPlayer, Player } from '@/domain/types'
import { cx } from '@/lib/cx'

export interface ManualLineupsModalProps {
  open: boolean
  onClose: () => void
  clubA: ClubId
  clubB: ClubId
  initialTeamA?: MatchPlayer[]
  initialTeamB?: MatchPlayer[]
  initialCaptainA?: string | null
  initialCaptainB?: string | null
  players: Player[]
  onSave: (lineups: {
    teamA: MatchPlayer[]
    teamB: MatchPlayer[]
    captainA: string | null
    captainB: string | null
  }) => Promise<void> | void
}

export function ManualLineupsModal({
  open,
  onClose,
  clubA,
  clubB,
  initialTeamA = [],
  initialTeamB = [],
  initialCaptainA = null,
  initialCaptainB = null,
  players,
  onSave,
}: ManualLineupsModalProps) {
  const clubAObj = getClub(clubA)
  const clubBObj = getClub(clubB)

  // Map of playerId -> 'A' | 'B'
  const [assignment, setAssignment] = useState<Record<string, 'A' | 'B'>>(() => {
    const map: Record<string, 'A' | 'B'> = {}
    for (const p of initialTeamA) map[p.id] = 'A'
    for (const p of initialTeamB) map[p.id] = 'B'
    return map
  })

  const [captainA, setCaptainA] = useState<string | null>(initialCaptainA)
  const [captainB, setCaptainB] = useState<string | null>(initialCaptainB)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [busy, setBusy] = useState(false)

  // Make sure any players from initialTeamA or initialTeamB exist in the pool
  const allPool = useMemo(() => {
    const pool = [...players]
    for (const p of [...initialTeamA, ...initialTeamB]) {
      if (!pool.some((x) => x.id === p.id)) {
        pool.push({
          id: p.id,
          name: p.name,
          rating: p.rating,
          stats: { rit: p.rating, tir: p.rating, pas: p.rating, reg: p.rating, def: p.rating, fis: p.rating },
          avatar: null,
          active: false,
        })
      }
    }
    return pool
  }, [players, initialTeamA, initialTeamB])

  const assignedA = useMemo(() => allPool.filter((p) => assignment[p.id] === 'A'), [allPool, assignment])
  const assignedB = useMemo(() => allPool.filter((p) => assignment[p.id] === 'B'), [allPool, assignment])

  const ratingA = assignedA.length > 0 ? assignedA.reduce((s, p) => s + p.rating, 0) / assignedA.length : 0
  const ratingB = assignedB.length > 0 ? assignedB.reduce((s, p) => s + p.rating, 0) / assignedB.length : 0
  const diff = Math.abs(ratingA - ratingB)

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allPool
      .filter((p) => {
        if (q && !p.name.toLowerCase().includes(q)) return false
        if (filter === 'active' && !p.active && !assignment[p.id]) return false
        return true
      })
      .sort((p1, p2) => {
        // Assigned first, then active first, then alphabetical
        const a1 = assignment[p1.id] ? 1 : 0
        const a2 = assignment[p2.id] ? 1 : 0
        if (a1 !== a2) return a2 - a1
        const act1 = p1.active ? 1 : 0
        const act2 = p2.active ? 1 : 0
        if (act1 !== act2) return act2 - act1
        return p1.name.localeCompare(p2.name)
      })
  }, [allPool, query, filter, assignment])

  function toggleTeam(id: string, side: 'A' | 'B') {
    setAssignment((prev) => {
      const next = { ...prev }
      if (next[id] === side) {
        delete next[id]
        if (captainA === id) setCaptainA(null)
        if (captainB === id) setCaptainB(null)
      } else {
        next[id] = side
        if (side === 'A' && captainB === id) setCaptainB(null)
        if (side === 'B' && captainA === id) setCaptainA(null)
      }
      return next
    })
  }

  function toggleCaptain(id: string, side: 'A' | 'B') {
    if (side === 'A') {
      setCaptainA((prev) => (prev === id ? null : id))
    } else {
      setCaptainB((prev) => (prev === id ? null : id))
    }
  }

  async function handleSave() {
    setBusy(true)
    try {
      const teamA: MatchPlayer[] = assignedA.map((p) => ({
        id: p.id,
        name: p.name,
        rating: p.rating,
      }))
      const teamB: MatchPlayer[] = assignedB.map((p) => ({
        id: p.id,
        name: p.name,
        rating: p.rating,
      }))
      await onSave({
        teamA,
        teamB,
        captainA: assignedA.some((p) => p.id === captainA) ? captainA : null,
        captainB: assignedB.some((p) => p.id === captainB) ? captainB : null,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const capAName = assignedA.find((p) => p.id === captainA)?.name
  const capBName = assignedB.find((p) => p.id === captainB)?.name

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Alineaciones manuales"
      title={`${clubAObj.name} vs ${clubBObj.name}`}
    >
      <div className="flex flex-col gap-4">
        {/* Team KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`club-${clubA} flex flex-col items-center gap-1.5 rounded-[18px] border border-[var(--line)] bg-white/[.03] p-3 text-center`}
          >
            <Crest club={clubA} size={36} />
            <span className="h-display text-base font-bold" style={{ color: clubAObj.primary }}>
              {clubAObj.short}
            </span>
            <span className="small text-xs">
              <strong>{assignedA.length}</strong> {assignedA.length === 1 ? 'jugador' : 'jugadores'} · Media{' '}
              <strong>{fmt(ratingA)}</strong>
            </span>
            {capAName && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ffd34d]">
                <Crown className="size-3" fill="currentColor" /> {capAName}
              </span>
            )}
          </div>

          <div
            className={`club-${clubB} flex flex-col items-center gap-1.5 rounded-[18px] border border-[var(--line)] bg-white/[.03] p-3 text-center`}
          >
            <Crest club={clubB} size={36} />
            <span className="h-display text-base font-bold" style={{ color: clubBObj.primary }}>
              {clubBObj.short}
            </span>
            <span className="small text-xs">
              <strong>{assignedB.length}</strong> {assignedB.length === 1 ? 'jugador' : 'jugadores'} · Media{' '}
              <strong>{fmt(ratingB)}</strong>
            </span>
            {capBName && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ffd34d]">
                <Crown className="size-3" fill="currentColor" /> {capBName}
              </span>
            )}
          </div>
        </div>

        {assignedA.length > 0 && assignedB.length > 0 && (
          <div className="flex items-center justify-center">
            <span className="small text-xs text-[var(--muted)]">
              Diferencia de media: <strong className="text-[var(--ink)]">±{fmt(diff)}</strong>
            </span>
          </div>
        )}

        {/* Search & Active filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              className="input h-10 w-full pl-9 text-sm"
              placeholder="Buscar jugador..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--muted)] hover:text-white"
                onClick={() => setQuery('')}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="seg h-10 p-1">
            <button
              type="button"
              className={cx('seg__btn text-xs', filter === 'active' && 'seg__btn--active')}
              onClick={() => setFilter('active')}
            >
              Activos
            </button>
            <button
              type="button"
              className={cx('seg__btn text-xs', filter === 'all' && 'seg__btn--active')}
              onClick={() => setFilter('all')}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Players list */}
        <div className="flex max-h-[380px] flex-col gap-1.5 overflow-y-auto pr-1">
          {filteredPlayers.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--muted)]">No hay jugadores con ese filtro.</p>
          ) : (
            filteredPlayers.map((p) => {
              const currentSide = assignment[p.id]
              const isCap =
                (currentSide === 'A' && captainA === p.id) || (currentSide === 'B' && captainB === p.id)

              return (
                <div
                  key={p.id}
                  className={cx(
                    'flex items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/[.03] p-2 transition-all',
                    currentSide === 'A' && 'border-white/20 bg-white/[.07]',
                    currentSide === 'B' && 'border-white/20 bg-white/[.07]',
                  )}
                >
                  <PlayerAvatar player={p} className="size-[32px] shrink-0 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{p.name}</span>
                      {isCap && (
                        <Crown
                          className="size-3.5 shrink-0 text-[#ffd34d]"
                          fill="currentColor"
                          aria-label="Capitán"
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--muted)] font-bold">Media {p.rating}</span>
                  </div>

                  {/* Team buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className={cx(
                        'btn btn--sm h-8 px-2.5 text-xs font-bold transition-all',
                        currentSide === 'A'
                          ? 'shadow-md ring-2 ring-white/30'
                          : 'bg-white/5 opacity-60 hover:opacity-100',
                      )}
                      style={
                        currentSide === 'A'
                          ? { backgroundColor: clubAObj.primary, color: clubAObj.ink }
                          : undefined
                      }
                      onClick={() => toggleTeam(p.id, 'A')}
                    >
                      {clubAObj.short}
                    </button>

                    <button
                      type="button"
                      className={cx(
                        'btn btn--sm h-8 px-2.5 text-xs font-bold transition-all',
                        currentSide === 'B'
                          ? 'shadow-md ring-2 ring-white/30'
                          : 'bg-white/5 opacity-60 hover:opacity-100',
                      )}
                      style={
                        currentSide === 'B'
                          ? { backgroundColor: clubBObj.primary, color: clubBObj.ink }
                          : undefined
                      }
                      onClick={() => toggleTeam(p.id, 'B')}
                    >
                      {clubBObj.short}
                    </button>

                    {currentSide && (
                      <button
                        type="button"
                        className={cx(
                          'btn btn--icon btn--ghost size-8 ml-0.5',
                          isCap ? 'text-[#ffd34d]' : 'text-white/30 hover:text-white',
                        )}
                        title={isCap ? 'Quitar capitanía' : 'Hacer capitán'}
                        onClick={() => toggleCaptain(p.id, currentSide)}
                      >
                        <Crown className="size-4" fill={isCap ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button className="btn btn--ghost h-[52px]" type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className="btn btn--primary h-[52px] flex-1"
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {busy ? <span className="spinner" /> : <Check />}
            Guardar alineaciones
          </button>
        </div>
      </div>
    </Sheet>
  )
}
