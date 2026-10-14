import {
  AlertTriangle,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Link2,
  Plus,
  Trash2,
  Trophy,
  X,
} from 'lucide-react'
import { LayoutGroup, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CardSkeletons, EmptyCards } from '@/components/States'
import { useToast } from '@/components/Toast'
import { Crest, CrestGhost, Seg } from '@/components/ui'
import type { PlayerPair } from '@/domain/balance'
import { resolveCaptains } from '@/domain/captains'
import { roundOf, tieLabel } from '@/domain/cup'
import { CLUBS, getClub } from '@/domain/clubs'
import { averageRating, fmt, initials, tier } from '@/domain/rating'
import type { ClubId, Player } from '@/domain/types'
import { cx } from '@/lib/cx'
import { useAuth } from '@/lib/auth'
import type { Collection } from '@/lib/data'
import { useDraw, type DrawConfig, type DrawStep } from '@/lib/draw'
import { runDraw, selectionOf, teamSizes } from '@/lib/runDraw'

const STEP_LABELS = ['Convocados', 'Clubes', 'Reglas']

export function DrawPage({
  players,
  captainDefaults,
}: {
  players: Collection<Player>
  /** Último capitán de cada club (para el capitán automático) */
  captainDefaults: Map<ClubId, string>
}) {
  const { config, step, setStep, mode, setMode, cupTie, pendingCupTie, clearCup } = useDraw()
  const { isAdmin } = useAuth()

  if (!isAdmin)
    return (
      <EmptyCards
        title="El sorteo es cosa del admin"
        action={
          <Link className="btn btn--white mt-1.5 h-[52px]" to="/bienvenida">
            Entrar como admin
          </Link>
        }
      >
        En modo espectador puedes ver la plantilla, la pizarra, la copa y el historial, pero no sortear.
      </EmptyCards>
    )
  if (players.loading) return <CardSkeletons count={4} />
  if (players.data.length < 2)
    return (
      <EmptyCards title="Faltan jugadores">
        Necesitas al menos 2 jugadores en la plantilla para sortear equipos.
      </EmptyCards>
    )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {pendingCupTie && (
        <Seg
          label="Tipo de partido"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'friendly', label: 'Amistoso' },
            {
              value: 'cup',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="size-3.5" /> Copa · {tieLabel(pendingCupTie.tie)}
                </span>
              ),
            },
          ]}
        />
      )}
      <div className="steps">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as DrawStep
          return (
            <button
              key={label}
              type="button"
              className={cx('step', n < step && 'step--done', n === step && 'step--now')}
              aria-current={n === step ? 'step' : undefined}
              onClick={() => setStep(n)}
            >
              <i />
              {n} · {label}
            </button>
          )
        })}
      </div>
      {cupTie && (
        <div className="glass glass--club flex items-center gap-3 px-3.5 py-2.5">
          <Trophy className="size-5 shrink-0 text-[var(--club)]" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-[10px]">Partido de copa · {roundOf(cupTie.tie).name}</p>
            <p className="truncate text-sm font-semibold">
              {cupTie.cupName} · {tieLabel(cupTie.tie)}: {getClub(config.clubA).name} vs{' '}
              {getClub(config.clubB).name}
            </p>
          </div>
          <button
            className="btn btn--ghost btn--icon"
            type="button"
            aria-label="Descartar el cruce de copa"
            title="Descartar el cruce de copa"
            onClick={clearCup}
          >
            <X />
          </button>
        </div>
      )}
      {step === 1 && <StepPlayers players={players.data} />}
      {step === 2 && <StepClubs players={players.data} captainDefaults={captainDefaults} />}
      {step === 3 && <StepRules players={players.data} captainDefaults={captainDefaults} />}
    </div>
  )
}

function useConfig() {
  const { config, setConfig } = useDraw()
  const set = <K extends keyof DrawConfig>(key: K, value: DrawConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))
  return { config, setConfig, set }
}

function BackHeader({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <button className="btn btn--glass btn--icon" type="button" aria-label="Paso anterior" onClick={onBack}>
        <ChevronLeft />
      </button>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h-display h-l mt-0.5">{title}</h1>
      </div>
    </div>
  )
}

/** Barra inferior fija sobre la tabbar */
function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(94px+env(safe-area-inset-bottom))] z-30 lg:inset-x-auto lg:right-10 lg:bottom-8 lg:left-[calc(248px+40px)]">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  )
}

// ---------- Paso 1 · Convocados ----------

function StepPlayers({ players }: { players: Player[] }) {
  const { config, setConfig } = useConfig()
  const { setStep } = useDraw()
  const selection = selectionOf(players, config)
  const selected = new Set(selection.map((p) => p.id))
  const n = selection.length
  const [a, b] = teamSizes(n, 'A')
  const byRating = [...players].sort((x, y) => y.rating - x.rating)

  const toggle = (p: Player) =>
    setConfig((c) => ({ ...c, overrides: { ...c.overrides, [p.id]: !(c.overrides[p.id] ?? p.active) } }))

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Sorteo · paso 1 de 3</p>
          <h1 className="h-display h-xl mt-1">¿Quién juega?</h1>
        </div>
        <div className="glass glass--club rounded-2xl px-3.5 py-2 text-center">
          <div className="h-display neon num text-5xl">{n}</div>
          <div className="eyebrow text-[10px]">convocados</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="pill h-10"
          type="button"
          onClick={() => setConfig((c) => ({ ...c, overrides: {} }))}
        >
          Los habituales
        </button>
        <button
          className="pill h-10"
          type="button"
          onClick={() =>
            setConfig((c) => ({ ...c, overrides: Object.fromEntries(players.map((p) => [p.id, false])) }))
          }
        >
          Ninguno
        </button>
        <span className="flex-1" />
        <span className="small">{n >= 2 ? `${a} contra ${b}` : 'Elige al menos 2'}</span>
      </div>

      <LayoutGroup>
        <div className="flex flex-col gap-6 pb-[150px] lg:pb-[120px]">
          {[
            { title: 'Juegan', list: byRating.filter((p) => selected.has(p.id)), accent: true },
            { title: 'No juegan', list: byRating.filter((p) => !selected.has(p.id)), accent: false },
          ].map(
            (group) =>
              group.list.length > 0 && (
                <section key={group.title} className="flex flex-col gap-2" aria-label={group.title}>
                  <div className="flex items-center gap-3">
                    <h2 className="h-display h-s">{group.title}</h2>
                    <span
                      className={cx('h-display num text-xl', group.accent ? 'neon' : 'text-[var(--muted)]')}
                    >
                      {group.list.length}
                    </span>
                    <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
                  </div>
                  {group.list.map((p) => {
                    const on = selected.has(p.id)
                    const m = Math.round(p.rating)
                    return (
                      <motion.button
                        key={p.id}
                        layoutId={`prow-${p.id}`}
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        className={cx('prow', on && 'prow--on')}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(p)}
                      >
                        <span className={cx('check', on && 'check--on')}>
                          {on && <Check strokeWidth={3} />}
                        </span>
                        <span className="avatar">{initials(p.name)}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                        <span className={`ovr-badge ovr-badge--${tier(m)}`}>{m}</span>
                      </motion.button>
                    )
                  })}
                </section>
              ),
          )}
        </div>
      </LayoutGroup>

      <BottomBar>
        <div
          className="glass flex flex-col gap-2 rounded-[20px] py-2.5 pr-2.5 pl-4"
          style={{ background: 'rgba(10,20,48,.86)' }}
        >
          {n % 2 === 1 && (
            <div className="banner banner--warn px-2.5 py-1.5 text-xs">
              <AlertTriangle />
              Número impar: un equipo jugará con uno menos.
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[15px] font-bold">
                <span className="num">{n}</span> convocados
              </div>
              <div className="small text-xs">
                Media del grupo <span className="num">{n ? fmt(averageRating(selection)) : '–'}</span>
              </div>
            </div>
            <button
              className="btn btn--primary h-12"
              type="button"
              disabled={n < 2}
              onClick={() => setStep(2)}
            >
              Siguiente <ChevronRight />
            </button>
          </div>
        </div>
      </BottomBar>
    </>
  )
}

// ---------- Paso 2 · Clubes y capitanes ----------

function StepClubs({
  players,
  captainDefaults,
}: {
  players: Player[]
  captainDefaults: Map<ClubId, string>
}) {
  const { config, set, setConfig } = useConfig()
  const { setStep, cupTie } = useDraw()
  const [editing, setEditing] = useState<'A' | 'B'>('A')
  const selection = selectionOf(players, config)
  const n = selection.length
  const mine = editing === 'A' ? config.clubA : config.clubB
  const other = editing === 'A' ? config.clubB : config.clubA

  const slot = (side: 'A' | 'B') => {
    const id = side === 'A' ? config.clubA : config.clubB
    return (
      <button
        className={`slot club-${id}`}
        type="button"
        aria-pressed={!cupTie && editing === side}
        disabled={!!cupTie}
        onClick={() => setEditing(side)}
      >
        <CrestGhost
          club={id}
          style={{ width: 200, height: 200, top: -40, [side === 'A' ? 'left' : 'right']: -30 }}
        />
        <span className="eyebrow" style={{ color: 'var(--club)' }}>
          Equipo {side} · {side === 'A' ? 'arriba' : 'abajo'}
        </span>
        <Crest club={id} size={92} />
        <span className="h-display h-s text-center">{getClub(id).name}</span>
      </button>
    )
  }

  const selectedIds = new Set(selection.map((p) => p.id))
  const [resolvedA, resolvedB] = resolveCaptains(config, selectedIds, captainDefaults)

  const captain = (side: 'A' | 'B') => {
    const club = side === 'A' ? config.clubA : config.clubB
    const key = side === 'A' ? 'captainA' : 'captainB'
    const choice = config[key]
    const resolved = side === 'A' ? resolvedA : resolvedB
    const rival = side === 'A' ? resolvedB : resolvedA
    const last = captainDefaults.get(club)
    const lastName = last ? players.find((p) => p.id === last)?.name : undefined
    const auto = choice === undefined
    // «Automático» solo se ofrece si el último capitán está convocado y no es el del rival
    const autoAvailable = !!last && selectedIds.has(last) && last !== rival
    const value = auto ? (resolved ? AUTO : '') : (resolved ?? '')
    return (
      <div className={`club-${club} flex flex-col gap-1.5`}>
        <div className="flex items-center gap-3">
          <Crest club={club} size={40} />
          <div className="relative min-w-0 flex-1">
            <label className="sr" htmlFor={`cap${side}`}>
              Capitán de {getClub(club).name}
            </label>
            <select
              id={`cap${side}`}
              className="select"
              value={value}
              onChange={(e) => set(key, e.target.value === AUTO ? undefined : e.target.value || null)}
              style={{ borderColor: 'color-mix(in oklab, var(--club) 50%, transparent)' }}
            >
              {autoAvailable && <option value={AUTO}>{lastName} · último capitán</option>}
              <option value="">Sin capitán</option>
              {selection.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === rival}>
                  {p.id === rival ? `${p.name} (equipo rival)` : p.name}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute top-3.5 right-3 size-5 rotate-90 text-[var(--muted)]" />
          </div>
        </div>
        {auto && resolved && (
          <p className="small flex items-center gap-1.5 pl-[52px] text-xs">
            <Crown className="size-3.5 text-[#ffd34d]" fill="currentColor" />
            Automático: fue el último capitán de {getClub(club).short}
          </p>
        )}
        {auto && !resolved && lastName && (
          <p className="small pl-[52px] text-xs">
            El último capitán de {getClub(club).short} ({lastName}) no está convocado.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-[110px]">
      <BackHeader
        eyebrow={`Paso 2 de 3 · ${n} convocados`}
        title="Clubes y capitanes"
        onBack={() => setStep(1)}
      />

      <div className="flex items-center gap-2">
        {slot('A')}
        <span className="h-display text-[34px] text-[var(--muted)]" aria-hidden>
          VS
        </span>
        {slot('B')}
      </div>

      {cupTie ? (
        <p className="small text-center text-xs">Los clubes los fija el cruce de copa.</p>
      ) : (
        <div className="glass flex flex-col gap-3 p-4">
          <p className="eyebrow">Escudo del equipo {editing}</p>
          <div className="picker" role="group" aria-label={`Escudo del equipo ${editing}`}>
            {CLUBS.map((c) => (
              <button
                key={c.id}
                className={`crest-opt club-${mine}`}
                type="button"
                aria-pressed={c.id === mine}
                disabled={c.id === other}
                onClick={() =>
                  setConfig((cfg) =>
                    editing === 'A'
                      ? { ...cfg, clubA: c.id as ClubId, captainA: undefined }
                      : { ...cfg, clubB: c.id as ClubId, captainB: undefined },
                  )
                }
              >
                <span className={`crest crest--${c.id}`} aria-hidden />
                {c.short}
                {c.id === other && <span className="taken">Equipo {editing === 'A' ? 'B' : 'A'}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="glass flex flex-col gap-3 p-4">
        <p className="eyebrow">Capitanes</p>
        {captain('A')}
        {captain('B')}
        <p className="small text-xs">
          Cada capitán queda fijo en su equipo; el resto se reparte en el sorteo.
        </p>
      </div>

      {n % 2 === 1 && (
        <div className="glass flex flex-col gap-3 p-4">
          <p className="eyebrow">Número impar · ¿quién juega con uno más?</p>
          <Seg
            label="Equipo con un jugador extra"
            value={config.extraTo}
            onChange={(v) => set('extraTo', v)}
            options={[
              { value: 'A', label: getClub(config.clubA).name },
              { value: 'B', label: getClub(config.clubB).name },
            ]}
          />
        </div>
      )}

      <BottomBar>
        <button className="btn btn--primary h-[54px] w-full" type="button" onClick={() => setStep(3)}>
          Siguiente: reglas <ChevronRight />
        </button>
      </BottomBar>
    </div>
  )
}

// ---------- Paso 3 · Reglas ----------

const AUTO = '__auto'

const TOLERANCES = [
  { value: '0.5', label: 'Estricta' },
  { value: '1', label: 'Normal' },
  { value: '2', label: 'Libre' },
  { value: 'custom', label: 'Otra' },
]
const isPreset = (t: number) => TOLERANCES.some((o) => o.value === String(t))
const fmtTolerance = (t: number) => fmt(t, Math.round(t * 10) === t * 10 ? 1 : 2)

function StepRules({
  players,
  captainDefaults,
}: {
  players: Player[]
  captainDefaults: Map<ClubId, string>
}) {
  const { config } = useConfig()
  const { setStep, setDraw, setRevealing, cupTie } = useDraw()
  const toast = useToast()
  const selection = selectionOf(players, config)
  const [a, b] = teamSizes(selection.length, config.extraTo)
  const { set } = useConfig()
  const [custom, setCustom] = useState(() => !isPreset(config.tolerance))
  const [draft, setDraft] = useState(() => fmtTolerance(config.tolerance))

  function sortear() {
    const out = runDraw(players, config, cupTie, captainDefaults)
    if (!out.ok) {
      toast(out.error, 'error')
      return
    }
    setDraw(out.draw)
    setRevealing(true)
  }

  return (
    <div className="flex flex-col gap-3.5 pb-[180px] lg:pb-[130px]">
      <BackHeader eyebrow="Paso 3 de 3 · opcional" title="Reglas del sorteo" onBack={() => setStep(2)} />

      <RuleBox kind="apart" selection={selection} />
      <RuleBox kind="together" selection={selection} />

      <div className="glass flex flex-col gap-2.5 p-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="h-display h-s">Tolerancia de equilibrio</h2>
          <span className="h-display neon text-[26px]">± {fmtTolerance(config.tolerance)}</span>
        </div>
        <p className="small text-xs">Diferencia máxima entre las medias de los dos equipos.</p>
        <Seg
          label="Tolerancia"
          value={custom ? 'custom' : String(config.tolerance)}
          onChange={(v) => {
            if (v === 'custom') {
              setCustom(true)
              setDraft(fmtTolerance(config.tolerance))
            } else {
              setCustom(false)
              set('tolerance', Number(v))
            }
          }}
          options={TOLERANCES}
        />
        {custom && (
          <div className="field">
            <label htmlFor="tolerance">Diferencia máxima personalizada (0 a 10)</label>
            <input
              id="tolerance"
              className="input"
              inputMode="decimal"
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                const n = Number(e.target.value.replace(',', '.'))
                if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= 0)
                  set('tolerance', Math.min(10, Math.round(n * 100) / 100))
              }}
            />
          </div>
        )}
      </div>

      <BottomBar>
        <div className="flex flex-col gap-3 rounded-[24px] bg-[rgba(3,6,15,.75)] p-1 backdrop-blur-md">
          <div className="flex items-center justify-center gap-2.5 pt-1">
            <Crest club={config.clubA} size={34} />
            <span className="small">
              <strong className="text-[var(--ink)]">{getClub(config.clubA).name}</strong> vs{' '}
              <strong className="text-[var(--ink)]">{getClub(config.clubB).name}</strong> · {a} contra {b}
            </span>
            <Crest club={config.clubB} size={34} />
          </div>
          <button className="btn btn--hero" type="button" disabled={selection.length < 2} onClick={sortear}>
            Sortear
          </button>
        </div>
      </BottomBar>
    </div>
  )
}

function RuleBox({ kind, selection }: { kind: 'apart' | 'together'; selection: Player[] }) {
  const { config, setConfig } = useConfig()
  const [adding, setAdding] = useState(false)
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const rules = config[kind]
  const name = (id: string) => selection.find((p) => p.id === id)?.name
  const apart = kind === 'apart'
  const color = apart ? '#FF8A96' : 'var(--ok)'
  const Icon = apart ? Ban : Link2

  const add = () => {
    if (!x || !y || x === y) return
    const pair: PlayerPair = [x, y]
    setConfig((c) => ({ ...c, [kind]: [...c[kind], pair] }))
    setX('')
    setY('')
    setAdding(false)
  }

  const picker = (value: string, onChange: (v: string) => void, exclude: string, label: string) => (
    <select
      className="select h-11 min-w-0 flex-1 text-sm"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Jugador…</option>
      {selection
        .filter((p) => p.id !== exclude)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </select>
  )

  return (
    <div className="glass flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid size-7 place-items-center rounded-full"
            style={{ background: apart ? 'rgba(255,90,106,.14)' : 'rgba(59,227,160,.14)', color }}
          >
            <Icon className="size-4" strokeWidth={2.2} />
          </span>
          <h2 className="h-display h-s">{apart ? 'Nunca juntos' : 'Siempre juntos'}</h2>
        </div>
        <button className="btn btn--ghost btn--sm h-11" type="button" onClick={() => setAdding((v) => !v)}>
          <Plus strokeWidth={2.4} /> Añadir
        </button>
      </div>

      {adding && (
        <div className="flex gap-2">
          {picker(x, setX, y, 'Primer jugador')}
          {picker(y, setY, x, 'Segundo jugador')}
          <button
            className="btn btn--primary btn--icon h-11"
            type="button"
            aria-label="Guardar regla"
            disabled={!x || !y}
            onClick={add}
          >
            <Check />
          </button>
        </div>
      )}

      {rules.length === 0 && !adding && <p className="small text-xs">Sin reglas.</p>}
      {rules.map((pair, i) => {
        const [n1, n2] = [name(pair[0]), name(pair[1])]
        const stale = !n1 || !n2
        return (
          <div
            key={i}
            className={cx(
              'flex items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/[.04] py-2 pr-1.5 pl-2.5',
              stale && 'opacity-45',
            )}
            title={stale ? 'Algún jugador no está convocado: la regla se ignora' : undefined}
          >
            <Who name={n1 ?? '¿?'} />
            <span
              className="grid size-7 shrink-0 place-items-center"
              style={{ color }}
              aria-label={apart ? 'separado de' : 'junto a'}
            >
              <Icon className="size-4" strokeWidth={2.4} />
            </span>
            <Who name={n2 ?? '¿?'} />
            <button
              className="btn btn--ghost btn--icon"
              type="button"
              aria-label="Quitar regla"
              onClick={() => setConfig((c) => ({ ...c, [kind]: c[kind].filter((p) => p !== pair) }))}
            >
              <Trash2 />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function Who({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="avatar size-[30px] text-sm">{initials(name)}</span>
      <span className="truncate text-[13px] font-semibold">{name}</span>
    </div>
  )
}
