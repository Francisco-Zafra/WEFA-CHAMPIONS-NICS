import { Check } from 'lucide-react'
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

/**
 * Votación del MVP de un partido: sin cuentas, un voto por navegador. El admin puede cerrarla
 * (proclama al más votado) o elegir el MVP a mano
 */
export function MvpVoting({ match, votes, players }: { match: Match; votes: Vote[]; players: Player[] }) {
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const now = useClock()
  const [choice, setChoice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState(false)
  const status = votingStatus(match, now)

  const candidates: (MatchPlayer & { side: 'A' | 'B' })[] = [
    ...match.teamA.map((p) => ({ ...p, side: 'A' as const })),
    ...match.teamB.map((p) => ({ ...p, side: 'B' as const })),
  ]
  const byId = new Map(candidates.map((c) => [c.id, c]))
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? byId.get(id)?.name ?? '¿?'
  const avatarOf = (id: string) => players.find((p) => p.id === id)?.avatar ?? null
  const mine = user ? votes.find((v) => v.matchId === match.id && v.uid === user.uid) : undefined
  const rows = tally(votes, match.id)
  const total = rows.reduce((a, r) => a + r.votes, 0)
  const top = rows[0]?.votes ?? 0

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true)
    try {
      await action()
      toast(message)
    } catch (e) {
      toast(voteError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const vote = () => choice && void run(() => castVote(match.id, choice), '¡Voto registrado!')

  function close() {
    const best = leaders(rows)
    void run(
      () => updateMatch(match.id, { votingClosed: true, ...(best.length === 1 ? { mvp: best[0]! } : {}) }),
      best.length === 1
        ? `MVP: ${nameOf(best[0]!)}`
        : best.length > 1
          ? 'Hay empate: elige el MVP a mano.'
          : 'Votación cerrada sin votos.',
    )
  }

  const setMvp = (id: string) =>
    void run(
      () => updateMatch(match.id, { mvp: id || null }),
      id ? `MVP: ${nameOf(id)}` : 'MVP quitado',
    ).then(() => setManual(false))

  const manualPick = isAdmin && manual && (
    <div className="field">
      <label htmlFor="mvp-pick">MVP del partido</label>
      <select
        id="mvp-pick"
        className="select"
        value={match.mvp ?? ''}
        disabled={busy}
        onChange={(e) => setMvp(e.target.value)}
      >
        <option value="">Sin MVP</option>
        {(['A', 'B'] as const).map((side) => (
          <optgroup key={side} label={side === 'A' ? 'Rojo' : 'Azul'}>
            {candidates
              .filter((c) => c.side === side)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {nameOf(c.id)}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  )

  if (status === 'none')
    return (
      <div className="flex flex-col gap-2.5">
        <div className="card__h">
          <span className="h-display h-s flex items-center gap-2">
            <span className="star" aria-hidden style={{ width: 18, height: 18 }} />
            MVP
          </span>
          {match.mvp && <span className="pillnote">Elegido a mano</span>}
        </div>
        {match.mvp ? (
          <div className="flex items-center gap-2.5">
            <PlayerAvatar player={{ name: nameOf(match.mvp), avatar: avatarOf(match.mvp) }} />
            <span className="flex-1 text-[15px] font-bold">{nameOf(match.mvp)}</span>
          </div>
        ) : (
          <p className="small text-[13px]">
            {match.scoreA === null
              ? 'La votación se abre al apuntar el resultado.'
              : 'Este partido es de antes de la votación: no tiene MVP.'}
          </p>
        )}
        {isAdmin && match.scoreA !== null && !manual && (
          <button className="btn btn--glass btn--sm self-start" type="button" onClick={() => setManual(true)}>
            Elegir a mano
          </button>
        )}
        {manualPick}
      </div>
    )

  const showResults = status === 'closed' || !!mine || isAdmin
  return (
    <section className="flex flex-col gap-2.5" aria-label="Votación del MVP">
      <div className="flex items-center justify-between gap-3">
        <span className="h-display h-s flex items-center gap-2">
          <span className="star" aria-hidden style={{ width: 18, height: 18 }} />
          {status === 'open' ? 'Votación abierta' : 'Votación cerrada'}
        </span>
        <span className="pillnote">
          {status === 'open'
            ? `Quedan ${timeLeft(votingDeadline(match)!, now)}`
            : `${total} ${total === 1 ? 'voto' : 'votos'}`}
        </span>
      </div>

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
                  'prow',
                  c.side === 'A' ? 'team-red' : 'team-blue',
                  choice === c.id && 'prow--on',
                )}
                style={choice === c.id ? { boxShadow: 'inset 0 -2px 0 var(--club)' } : undefined}
              >
                <PlayerAvatar
                  player={{ name: nameOf(c.id), avatar: avatarOf(c.id) }}
                  className="size-[34px] text-sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nameOf(c.id)}</span>
              </button>
            ))}
          </div>
          <button className="btn btn--primary h-12" type="button" disabled={!choice || busy} onClick={vote}>
            {busy ? <span className="spinner" /> : <Check />}
            {choice ? `Votar a ${nameOf(choice)}` : 'Elige a un jugador'}
          </button>
        </>
      )}

      {showResults && (
        <div className="flex flex-col gap-2">
          {rows.length === 0 && <p className="small text-xs">Aún no hay votos.</p>}
          {rows.map((r) => (
            <div key={r.playerId} className={cx('vote', mine?.playerId === r.playerId && 'vote--me')}>
              <span className="n">{nameOf(r.playerId)}</span>
              <div className="hbar">
                <i
                  style={{
                    width: `${(r.votes / (top || 1)) * 100}%`,
                    background:
                      r.votes === top
                        ? 'var(--gold)'
                        : mine?.playerId === r.playerId
                          ? '#9B7BFF'
                          : 'rgba(255,255,255,.35)',
                  }}
                />
              </div>
              <span className="text-right font-bold">{r.votes}</span>
            </div>
          ))}
        </div>
      )}

      {status === 'closed' && match.mvp && (
        <div className="flex items-center gap-2.5">
          <PlayerAvatar player={{ name: nameOf(match.mvp), avatar: avatarOf(match.mvp) }} />
          <span className="flex-1 text-[15px] font-bold">{nameOf(match.mvp)}</span>
          <span className="note">
            MVP · {rows.find((r) => r.playerId === match.mvp)?.votes ?? 0} de {total} votos
          </span>
        </div>
      )}

      <p className="note">
        {status === 'open'
          ? mine
            ? `Has votado por ${nameOf(mine.playerId)}. Un voto por persona; la estrella sale en la alineación al cerrar.`
            : `${total} ${total === 1 ? 'voto' : 'votos'} · un voto por persona durante 72 h, sin cuenta.`
          : 'Votación terminada.'}
      </p>

      {isAdmin && (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button className="btn btn--glass btn--sm h-11" type="button" onClick={() => setManual((x) => !x)}>
            Elegir a mano
          </button>
          {status === 'open' && (
            <button className="btn btn--primary btn--sm h-11" type="button" disabled={busy} onClick={close}>
              Cerrar votación
            </button>
          )}
        </div>
      )}
      {manualPick}
    </section>
  )
}
