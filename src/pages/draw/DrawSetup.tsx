import { Link2, Link2Off, Plus, RotateCcw, Sparkles, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ClubPicker } from '@/components/ClubPicker'
import { Button, Segmented } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { PlayerPair } from '@/domain/balance'
import { getClub } from '@/domain/clubs'
import { averageRating, overall } from '@/domain/rating'
import type { Player } from '@/domain/types'
import { useDraw, type DrawConfig } from '@/lib/draw'

export function DrawSetup({
  players,
  selection,
  onDraw,
}: {
  players: Player[]
  selection: Player[]
  onDraw: () => void
}) {
  const { config, setConfig } = useDraw()
  const set = <K extends keyof DrawConfig>(key: K, value: DrawConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))
  const selected = new Set(selection.map((p) => p.id))
  const n = selection.length
  const odd = n % 2 === 1
  const sizeA = odd ? (config.extraTo === 'A' ? Math.ceil(n / 2) : Math.floor(n / 2)) : n / 2
  const byRating = [...players].sort((a, b) => overall(b.stats) - overall(a.stats))
  const clubA = getClub(config.clubA)
  const clubB = getClub(config.clubB)

  const toggle = (p: Player) =>
    setConfig((c) => ({ ...c, overrides: { ...c.overrides, [p.id]: !(c.overrides[p.id] ?? p.active) } }))
  const setAll = (value: boolean) =>
    setConfig((c) => ({ ...c, overrides: Object.fromEntries(players.map((p) => [p.id, value])) }))

  return (
    <div className="flex flex-col gap-4 pb-28">
      <Step
        n={1}
        title="Convocatoria"
        hint={`${n} convocados · media ${n ? averageRating(selection).toFixed(1) : '–'}`}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAll(true)}>
            Todos
          </Button>
          <Button size="sm" onClick={() => setAll(false)}>
            Ninguno
          </Button>
          <Button
            size="sm"
            onClick={() => set('overrides', {})}
            title="Volver a los convocados de la plantilla"
          >
            <RotateCcw className="size-3.5" /> Plantilla
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {byRating.map((p) => {
            const on = selected.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p)}
                className={cx(
                  'flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm font-semibold transition active:scale-95',
                  on
                    ? 'border-accent/60 bg-accent/15 text-ink'
                    : 'border-line text-muted bg-white/[0.03] hover:text-ink',
                )}
              >
                <span
                  className={cx(
                    'flex h-6 min-w-8 items-center justify-center rounded-full px-1 text-xs font-extrabold tabular-nums',
                    on ? 'bg-accent text-night-950' : 'bg-white/10',
                  )}
                >
                  {Math.round(overall(p.stats))}
                </span>
                {p.name}
              </button>
            )
          })}
        </div>
      </Step>

      <Step n={2} title="Clubes y capitanes" hint={n >= 2 ? `${sizeA} vs ${n - sizeA}` : undefined}>
        <div className="grid gap-6 md:grid-cols-2">
          {(['A', 'B'] as const).map((side) => {
            const clubKey = side === 'A' ? 'clubA' : 'clubB'
            const capKey = side === 'A' ? 'captainA' : 'captainB'
            const club = side === 'A' ? clubA : clubB
            const otherCap = side === 'A' ? config.captainB : config.captainA
            return (
              <div key={side} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="label">Equipo {side}</span>
                  <span className="display text-2xl" style={{ color: club.primary }}>
                    {club.emoji} {club.name}
                  </span>
                </div>
                <ClubPicker
                  value={config[clubKey]}
                  taken={side === 'A' ? config.clubB : config.clubA}
                  onChange={(id) => set(clubKey, id)}
                />
                <label className="flex flex-col gap-1.5">
                  <span className="label">Capitán</span>
                  <select
                    value={config[capKey] && selected.has(config[capKey]) ? config[capKey] : ''}
                    onChange={(e) => set(capKey, e.target.value || null)}
                    className="border-line focus:border-accent bg-night-800 h-11 rounded-xl border px-3 outline-none"
                  >
                    <option value="">— Sin capitán —</option>
                    {selection
                      .filter((p) => p.id !== otherCap)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({overall(p.stats).toFixed(1)})
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )
          })}
        </div>
        {odd && n > 1 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-muted text-sm">Número impar: el jugador extra va para</span>
            <Segmented
              className="sm:w-80"
              value={config.extraTo}
              onChange={(v) => set('extraTo', v)}
              options={[
                { value: 'A', label: `${clubA.emoji} ${clubA.name}` },
                { value: 'B', label: `${clubB.emoji} ${clubB.name}` },
              ]}
            />
          </div>
        )}
      </Step>

      <Step n={3} title="Reglas del míster" hint="Opcional">
        <RulesEditor selection={selection} />
        <label className="mt-5 flex flex-col gap-2">
          <span className="flex items-center justify-between">
            <span className="label">Diferencia máxima de media</span>
            <span className="display text-accent text-2xl tabular-nums">± {config.tolerance.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={config.tolerance}
            onChange={(e) => set('tolerance', Number(e.target.value))}
            aria-label="Diferencia máxima de media"
          />
          <span className="text-muted text-xs">
            Cuanto más baja, más igualados; cuanto más alta, más variedad entre sorteos. Además de la media,
            el algoritmo equilibra cada stat (ritmo, tiro, pase…).
          </span>
        </label>
      </Step>

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 sm:bottom-6 lg:left-64">
        <div className="mx-auto max-w-md">
          <Button variant="gold" size="lg" className="w-full" disabled={n < 2} onClick={onDraw}>
            <Sparkles className="size-6" /> Sortear {n >= 2 && `· ${sizeA} vs ${n - sizeA}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="panel p-4 sm:p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="display bg-gold text-night-950 flex size-8 items-center justify-center rounded-lg text-xl">
          {n}
        </span>
        <h2 className="display flex-1 text-3xl">{title}</h2>
        {hint && <span className="text-muted text-sm font-semibold">{hint}</span>}
      </header>
      {children}
    </section>
  )
}

function RulesEditor({ selection }: { selection: Player[] }) {
  const { config, setConfig } = useDraw()
  const [kind, setKind] = useState<'together' | 'apart'>('apart')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const name = (id: string) => selection.find((p) => p.id === id)?.name
  const rules = [
    ...config.together.map((pair) => ({ kind: 'together' as const, pair })),
    ...config.apart.map((pair) => ({ kind: 'apart' as const, pair })),
  ]

  const add = () => {
    if (!a || !b || a === b) return
    const pair: PlayerPair = [a, b]
    setConfig((c) => ({ ...c, [kind]: [...c[kind], pair] }))
    setA('')
    setB('')
  }
  const remove = (k: 'together' | 'apart', pair: PlayerPair) =>
    setConfig((c) => ({ ...c, [k]: c[k].filter((p) => p !== pair) }))

  const select = (value: string, onChange: (v: string) => void, exclude: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-line focus:border-accent bg-night-800 h-10 min-w-0 flex-1 rounded-xl border px-2 text-sm outline-none"
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Segmented
          value={kind}
          onChange={setKind}
          className="sm:w-64"
          options={[
            { value: 'apart', label: 'Separados' },
            { value: 'together', label: 'Juntos' },
          ]}
        />
        <div className="flex flex-1 gap-2">
          {select(a, setA, b)}
          {select(b, setB, a)}
          <Button size="sm" className="h-10" onClick={add} disabled={!a || !b} aria-label="Añadir regla">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
      {rules.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {rules.map(({ kind: k, pair }, i) => {
            const stale = !name(pair[0]) || !name(pair[1])
            return (
              <li
                key={i}
                className={cx(
                  'flex items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-sm font-semibold',
                  k === 'apart' ? 'border-loss/40 bg-loss/10' : 'border-win/40 bg-win/10',
                  stale && 'opacity-40',
                )}
                title={stale ? 'Algún jugador no está convocado: la regla se ignora' : undefined}
              >
                {k === 'apart' ? <Link2Off className="size-4" /> : <Link2 className="size-4" />}
                {name(pair[0]) ?? '¿?'} {k === 'apart' ? '≠' : '+'} {name(pair[1]) ?? '¿?'}
                <button
                  type="button"
                  onClick={() => remove(k, pair)}
                  className="rounded-full p-1 hover:bg-white/10"
                  aria-label="Quitar regla"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
