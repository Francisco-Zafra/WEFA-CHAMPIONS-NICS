import { Check, Lock, Star } from 'lucide-react'
import { useState } from 'react'
import { leaders, tally, timeLeft, votingDeadline, votingStatus, type Vote } from '@/domain/votes'
import type { Match, MatchPlayer, Player } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { cx } from '@/lib/cx'
import { castVote, updateMatch } from '@/lib/data'
import { useClock } from '@/lib/votesContext'
import { PlayerAvatar } from './PlayerAvatar'
import { useToast } from './Toast'

function voteError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'permission-denied') return 'Ya has votado en este partido o la votación está cerrada.'
  if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed')
    return 'La votación aún no está activada (falta habilitar el acceso anónimo en Firebase).'
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'Sin conexión.'
  return 'No se pudo registrar el voto.'
}

/** Votación del MVP de un partido: sin cuentas, un voto por navegador */
export function MvpVoting({ match, votes, players }: { match: Match; votes: Vote[]; players: Player[] }) {
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const now = useClock()
  const [choice, setChoice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const status = votingStatus(match, now)
  if (status === 'none') return null

  const mine = user ? votes.find((v) => v.matchId === match.id && v.uid === user.uid) : undefined
  const rows = tally(votes, match.id)
  const total = rows.reduce((a, r) => a + r.votes, 0)
  const candidates: (MatchPlayer & { club: 'A' | 'B' })[] = [
    ...match.teamA.map((p) => ({ ...p, club: 'A' as const })),
    ...match.teamB.map((p) => ({ ...p, club: 'B' as const })),
  ]
  const byId = new Map(candidates.map((c) => [c.id, c]))
  const nameOf = (id: string) => byId.get(id)?.name ?? '¿?'
  const avatarOf = (id: string) => players.find((p) => p.id === id)?.avatar ?? null
  const deadline = votingDeadline(match)!
  const showResults = status === 'closed' || !!mine || isAdmin
  const max = rows[0]?.votes ?? 1

  async function vote() {
    if (!choice) return
    setBusy(true)
    try {
      await castVote(match.id, choice)
      toast('¡Voto registrado!')
      setChoice(null)
    } catch (e) {
      toast(voteError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function close() {
    const top = leaders(rows)
    setBusy(true)
    try {
      await updateMatch(match.id, { votingClosed: true, ...(top.length === 1 ? { mvp: top[0]! } : {}) })
      toast(
        top.length === 1
          ? `MVP: ${nameOf(top[0]!)}`
          : top.length > 1
            ? 'Hay empate: elige el MVP en el desplegable de abajo.'
            : 'Votación cerrada sin votos.',
        top.length > 1 ? 'info' : 'success',
      )
    } catch {
      toast('No se pudo cerrar la votación', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass flex flex-col gap-3 p-4" aria-label="Votación del MVP">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Votación del MVP</p>
          <h3 className="h-display h-m mt-1 flex items-center gap-2">
            <Star className="size-5 text-[var(--warn)]" fill="currentColor" />
            {status === 'open' ? '¿Quién fue el mejor?' : 'Votación cerrada'}
          </h3>
        </div>
        <span className="small shrink-0 text-right text-xs">
          {status === 'open' ? (
            <>
              Cierra en
              <br />
              <strong className="text-[var(--ink)]">{timeLeft(deadline, now)}</strong>
            </>
          ) : (
            <span className="flex items-center gap-1">
              <Lock className="size-3.5" /> {total} {total === 1 ? 'voto' : 'votos'}
            </span>
          )}
        </span>
      </header>

      {status === 'open' && !mine && (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Elige al MVP">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={choice === c.id}
                onClick={() => setChoice(c.id)}
                className={cx(
                  'prow club-' + (c.club === 'A' ? match.clubA : match.clubB),
                  choice === c.id && 'prow--on',
                )}
              >
                <PlayerAvatar
                  player={{ name: c.name, avatar: avatarOf(c.id) }}
                  className="size-[34px] text-sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
              </button>
            ))}
          </div>
          <button
            className="btn btn--primary h-12"
            type="button"
            disabled={!choice || busy}
            onClick={() => void vote()}
          >
            {busy ? <span className="spinner" /> : <Check />}
            {choice ? `Votar a ${nameOf(choice)}` : 'Elige a un jugador'}
          </button>
          <p className="small text-xs">
            Solo puedes votar una vez. Sin cuentas: tu voto se guarda en este navegador.
          </p>
        </>
      )}

      {status === 'open' && mine && (
        <p className="flex items-center gap-2 text-sm">
          <Check className="size-4 text-[var(--ok)]" /> Has votado por{' '}
          <strong>{nameOf(mine.playerId)}</strong>. Gracias.
        </p>
      )}

      {showResults && (
        <ol className="flex flex-col gap-1.5">
          {rows.length === 0 && <li className="small text-xs">Aún no hay votos.</li>}
          {rows.map((r) => {
            const c = byId.get(r.playerId)
            return (
              <li
                key={r.playerId}
                className={cx(
                  'flex items-center gap-2.5',
                  c && `club-${c.club === 'A' ? match.clubA : match.clubB}`,
                )}
              >
                <PlayerAvatar
                  player={{ name: nameOf(r.playerId), avatar: avatarOf(r.playerId) }}
                  className="size-7 text-xs"
                />
                <span className="w-24 shrink-0 truncate text-sm font-semibold">{nameOf(r.playerId)}</span>
                <span className="sbar flex-1" style={{ height: 8 }}>
                  <i
                    style={{
                      left: 0,
                      width: `${(r.votes / max) * 100}%`,
                      background: 'var(--club)',
                      borderRadius: 8,
                    }}
                  />
                </span>
                <span className="num w-5 text-right text-sm font-bold">{r.votes}</span>
              </li>
            )
          })}
        </ol>
      )}

      {status === 'closed' && match.mvp && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-[var(--warn)]">
          <Star className="size-4" fill="currentColor" /> MVP: {nameOf(match.mvp)}
        </p>
      )}

      {isAdmin && status === 'open' && (
        <button
          className="btn btn--glass btn--sm self-start"
          type="button"
          disabled={busy}
          onClick={() => void close()}
        >
          <Lock /> Cerrar votación{rows.length ? ' y proclamar MVP' : ''}
        </button>
      )}
    </section>
  )
}
