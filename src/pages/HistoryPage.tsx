import { ChevronDown, Crown, Minus, Pencil, Plus, Star, Trash2, Trophy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { Button, ClubBadge, EmptyState, Segmented, SectionTitle, Spinner } from '@/components/ui'
import { cx } from '@/lib/cx'
import { getClub } from '@/domain/clubs'
import { clubStandings, isPlayed, playerStandings, type Outcome } from '@/domain/standings'
import type { Match, Player } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { deleteMatch, updateMatch, type Collection } from '@/lib/data'

type Tab = 'matches' | 'clubs' | 'players'

export function HistoryPage({
  matches,
  players,
}: {
  matches: Collection<Match>
  players: Collection<Player>
}) {
  const [tab, setTab] = useState<Tab>('matches')
  const played = matches.data.filter(isPlayed).length

  return (
    <div>
      <SectionTitle kicker={`${played} partidos jugados`} title="Historial" />
      <Segmented<Tab>
        className="mb-5 sm:w-96"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'matches', label: 'Partidos' },
          { value: 'clubs', label: 'Clubes' },
          { value: 'players', label: 'Jugadores' },
        ]}
      />
      {matches.loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-10" />
        </div>
      ) : matches.error ? (
        <EmptyState icon="📡" title="Sin señal">
          No se pudo cargar el historial.
        </EmptyState>
      ) : tab === 'matches' ? (
        <MatchList matches={matches.data} />
      ) : tab === 'clubs' ? (
        <ClubTable matches={matches.data} />
      ) : (
        <PlayerTable matches={matches.data} players={players.data} />
      )}
    </div>
  )
}

// ---------- Partidos ----------

function MatchList({ matches }: { matches: Match[] }) {
  const [editing, setEditing] = useState<Match | null>(null)
  if (matches.length === 0)
    return (
      <EmptyState icon="🏟️" title="Aún no hay partidos">
        Haz un sorteo y pulsa «Guardar partido» para empezar a escribir la historia.
      </EmptyState>
    )
  return (
    <>
      <ul className="flex flex-col gap-3">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} onEdit={() => setEditing(m)} />
        ))}
      </ul>
      <ScoreSheet match={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function MatchCard({ match, onEdit }: { match: Match; onEdit: () => void }) {
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const a = getClub(match.clubA)
  const b = getClub(match.clubB)
  const done = isPlayed(match)
  const date = new Date(`${match.date}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const mvp = [...match.teamA, ...match.teamB].find((p) => p.id === match.mvp)

  return (
    <li className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-4 text-left"
        aria-expanded={open}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="label">{date}</span>
          <ChevronDown className={cx('text-muted size-4 transition', open && 'rotate-180')} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ClubBadge club={a.id} className="w-10 shrink-0" />
            <span className="display truncate text-xl sm:text-2xl">{a.name}</span>
          </div>
          {done ? (
            <span className="display text-4xl tabular-nums">
              <span className={match.scoreA! > match.scoreB! ? 'text-gold' : ''}>{match.scoreA}</span>
              <span className="text-muted mx-1.5">-</span>
              <span className={match.scoreB! > match.scoreA! ? 'text-gold' : ''}>{match.scoreB}</span>
            </span>
          ) : (
            <span className="bg-accent/15 text-accent rounded-full px-3 py-1 text-xs font-bold uppercase">
              Pendiente
            </span>
          )}
          <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
            <ClubBadge club={b.id} className="w-10 shrink-0" />
            <span className="display truncate text-xl sm:text-2xl">{b.name}</span>
          </div>
        </div>
        {mvp && (
          <p className="text-gold mt-2 flex items-center justify-center gap-1 text-xs font-bold">
            <Star className="size-3.5 fill-current" /> MVP: {mvp.name}
          </p>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-line grid grid-cols-2 gap-4 border-t px-4 py-3 text-sm">
              {[
                [match.teamA, match.captainA, a.primary],
                [match.teamB, match.captainB, b.primary],
              ].map(([team, captain, color], i) => (
                <ul key={i} className={cx('flex flex-col gap-1', i === 1 && 'text-right')}>
                  {(team as Match['teamA']).map((p) => (
                    <li key={p.id} className={cx('flex items-center gap-1', i === 1 && 'justify-end')}>
                      {p.id === captain && <Crown className="size-3.5" style={{ color: color as string }} />}
                      {p.name}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
            {isAdmin && (
              <div className="px-4 pb-4">
                <Button size="sm" variant="primary" onClick={onEdit}>
                  <Pencil className="size-3.5" /> {done ? 'Editar resultado' : 'Poner resultado'}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function ScoreSheet({ match, onClose }: { match: Match | null; onClose: () => void }) {
  return (
    <Sheet open={match !== null} onClose={onClose} title="Resultado">
      {match && <ScoreForm key={match.id} match={match} onDone={onClose} />}
    </Sheet>
  )
}

function ScoreForm({ match, onDone }: { match: Match; onDone: () => void }) {
  const toast = useToast()
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0)
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0)
  const [mvp, setMvp] = useState(match.mvp ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const a = getClub(match.clubA)
  const b = getClub(match.clubB)

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true)
    try {
      await action()
      toast(message)
      onDone()
    } catch {
      toast('No se pudo guardar', 'error')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <Stepper label={a.name} color={a.primary} value={scoreA} onChange={setScoreA} />
        <Stepper label={b.name} color={b.primary} value={scoreB} onChange={setScoreB} />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="label">MVP del partido</span>
        <select
          value={mvp}
          onChange={(e) => setMvp(e.target.value)}
          className="border-line focus:border-accent bg-night-800 h-11 rounded-xl border px-3 outline-none"
        >
          <option value="">— Sin MVP —</option>
          <optgroup label={a.name}>
            {match.teamA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={b.name}>
            {match.teamB.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <div className="flex gap-2">
        {confirmDelete ? (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => void run(() => deleteMatch(match.id), 'Partido eliminado')}
          >
            ¿Seguro? Eliminar
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Eliminar partido">
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button
          variant="primary"
          className="flex-1"
          disabled={busy}
          onClick={() =>
            void run(() => updateMatch(match.id, { scoreA, scoreB, mvp: mvp || null }), 'Resultado guardado')
          }
        >
          Guardar resultado
        </Button>
      </div>
    </div>
  )
}

function Stepper({
  label,
  color,
  value,
  onChange,
}: {
  label: string
  color: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="display truncate text-xl" style={{ color }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Quitar gol a ${label}`}
        >
          <Minus className="size-4" />
        </Button>
        <span className="display w-14 text-center text-6xl tabular-nums">{value}</span>
        <Button
          size="sm"
          onClick={() => onChange(Math.min(99, value + 1))}
          aria-label={`Sumar gol a ${label}`}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------- Clasificaciones ----------

function ClubTable({ matches }: { matches: Match[] }) {
  const rows = useMemo(() => clubStandings(matches), [matches])
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-left text-xs">
            <th className="p-3">#</th>
            <th className="p-3">Club</th>
            <Th>PJ</Th>
            <Th>G</Th>
            <Th>E</Th>
            <Th>P</Th>
            <Th className="hidden sm:table-cell">GF</Th>
            <Th className="hidden sm:table-cell">GC</Th>
            <Th>DG</Th>
            <Th>Pts</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const club = getClub(r.club)
            return (
              <tr key={r.club} className={cx('border-line border-t', r.played === 0 && 'opacity-45')}>
                <td className="p-3 font-bold tabular-nums">
                  {i === 0 && r.points > 0 ? <Trophy className="text-gold size-4" /> : i + 1}
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-2">
                    <ClubBadge club={r.club} className="w-7" />
                    <span className="display text-lg whitespace-nowrap">{club.name}</span>
                  </span>
                </td>
                <Td>{r.played}</Td>
                <Td>{r.won}</Td>
                <Td>{r.drawn}</Td>
                <Td>{r.lost}</Td>
                <Td className="hidden sm:table-cell">{r.goalsFor}</Td>
                <Td className="hidden sm:table-cell">{r.goalsAgainst}</Td>
                <Td>{r.goalsFor - r.goalsAgainst}</Td>
                <Td className="text-gold font-extrabold">{r.points}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PlayerTable({ matches, players }: { matches: Match[]; players: Player[] }) {
  const rows = useMemo(
    () => playerStandings(matches, new Map(players.map((p) => [p.id, p.name]))),
    [matches, players],
  )
  if (rows.length === 0)
    return (
      <EmptyState icon="📊" title="Sin estadísticas">
        Cuando haya partidos con resultado aparecerá aquí el ranking de jugadores.
      </EmptyState>
    )
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-left text-xs">
            <th className="p-3">#</th>
            <th className="p-3">Jugador</th>
            <Th>PJ</Th>
            <Th>G</Th>
            <Th className="hidden sm:table-cell">E</Th>
            <Th className="hidden sm:table-cell">P</Th>
            <Th>% Vic</Th>
            <Th>MVP</Th>
            <Th className="hidden sm:table-cell">Forma</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-line border-t">
              <td className="p-3 font-bold tabular-nums">{i + 1}</td>
              <td className="p-3 font-semibold whitespace-nowrap">{r.name}</td>
              <Td>{r.played}</Td>
              <Td className="text-win font-bold">{r.won}</Td>
              <Td className="hidden sm:table-cell">{r.drawn}</Td>
              <Td className="hidden sm:table-cell">{r.lost}</Td>
              <Td>{Math.round(r.winRate * 100)}%</Td>
              <Td className="text-gold">{r.mvps || ''}</Td>
              <td className="hidden p-3 sm:table-cell">
                <span className="flex justify-end gap-1">
                  {r.form.map((o, j) => (
                    <FormDot key={j} outcome={o} />
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FORM: Record<Outcome, [string, string]> = {
  W: ['V', 'bg-win text-night-950'],
  D: ['E', 'bg-draw text-night-950'],
  L: ['D', 'bg-loss text-night-950'],
}

function FormDot({ outcome }: { outcome: Outcome }) {
  const [letter, cls] = FORM[outcome]
  return (
    <span className={cx('flex size-5 items-center justify-center rounded text-[10px] font-extrabold', cls)}>
      {letter}
    </span>
  )
}

const Th = ({ children, className }: { children: ReactNode; className?: string }) => (
  <th className={cx('p-3 text-right', className)}>{children}</th>
)
const Td = ({ children, className }: { children: ReactNode; className?: string }) => (
  <td className={cx('p-3 text-right tabular-nums', className)}>{children}</td>
)
