import { ArrowUpDown, Info, Plus, Search } from 'lucide-react'
import { LayoutGroup, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalibrationButton } from '@/components/Calibration'
import { PlayerCard } from '@/components/PlayerCard'
import { PlayerEditorPanel, PlayerEditorSheet } from '@/components/PlayerEditor'
import { CardSkeletons, EmptyCards, ErrorState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { Banner, PageHeader, Switch } from '@/components/ui'
import { tier, type Tier } from '@/domain/rating'
import type { Match, Player } from '@/domain/types'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useAuth } from '@/lib/auth'
import { cx } from '@/lib/cx'
import { updatePlayer, type Collection } from '@/lib/data'

type Filter = 'all' | 'active' | Tier
type Sort = 'rating' | 'name'

/** null = cerrado; 'new' = alta; Player = edición */
type Editing = null | 'new' | Player

export function SquadPage({ players, matches }: { players: Collection<Player>; matches: Collection<Match> }) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const desktop = useIsDesktop()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('rating')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Editing>(null)

  const all = players.data
  const convCount = all.filter((p) => p.active).length
  const count = (t: Tier) => all.filter((p) => tier(p.rating) === t).length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => (filter === 'all' ? true : filter === 'active' ? p.active : tier(p.rating) === filter))
      .sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name, 'es')
          : b.rating - a.rating || a.name.localeCompare(b.name, 'es'),
      )
  }, [all, filter, sort, query])

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `Todos · ${all.length}` },
    { id: 'active', label: `Convocados · ${convCount}` },
    { id: 'gold', label: `Oro · ${count('gold')}` },
    { id: 'silver', label: `Plata · ${count('silver')}` },
    { id: 'bronze', label: `Bronce · ${count('bronze')}` },
  ]
  const sortLabel = sort === 'rating' ? 'Media ↓' : 'Nombre A–Z'
  const editingPlayer = editing && editing !== 'new' ? editing : null

  async function toggleActive(p: Player, active: boolean) {
    try {
      await updatePlayer(p.id, { active })
    } catch {
      toast('No se pudo actualizar', 'error')
    }
  }

  const addButton = isAdmin && (
    <button
      className="btn btn--primary btn--sm h-11 lg:h-12 lg:px-5 lg:text-[15px]"
      type="button"
      onClick={() => setEditing('new')}
    >
      <Plus strokeWidth={2.4} /> Añadir<span className="hidden lg:inline"> jugador</span>
    </button>
  )

  let content
  if (players.loading) content = <CardSkeletons />
  else if (players.error)
    content = (
      <ErrorState title="Se ha ido la luz del estadio">
        No hemos podido cargar la plantilla. Revisa tu conexión e inténtalo de nuevo.
      </ErrorState>
    )
  else if (all.length === 0)
    content = (
      <EmptyCards
        title="Aún no hay fichajes"
        action={
          isAdmin && (
            <button
              className="btn btn--primary mt-1.5 h-[52px]"
              type="button"
              onClick={() => setEditing('new')}
            >
              Añadir primer jugador
            </button>
          )
        }
      >
        {isAdmin
          ? 'Añade a tus amigos con sus seis stats y la app generará su carta automáticamente.'
          : 'El admin todavía no ha fichado a nadie.'}
      </EmptyCards>
    )
  else if (visible.length === 0)
    content = (
      <div className="glass flex flex-col items-center gap-2.5 px-5 py-7 text-center">
        <div className="h-display h-m">Nadie con ese nombre</div>
        <p className="small">Prueba otra búsqueda o quita el filtro.</p>
        <button
          className="btn btn--glass btn--sm"
          type="button"
          onClick={() => {
            setQuery('')
            setFilter('all')
          }}
        >
          Limpiar filtros
        </button>
      </div>
    )
  else {
    const grid = (list: Player[]) => (
      <div className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(172px,1fr))] lg:gap-x-4 lg:gap-y-7">
        {list.map((p) => (
          <motion.div
            key={p.id}
            layoutId={p.id}
            className="cell"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {isAdmin ? (
              <button
                className="pc-btn"
                type="button"
                aria-label={`Editar ${p.name}`}
                onClick={() => setEditing(p)}
              >
                <PlayerCard player={p} off={!p.active} size={desktop ? 11 : 10} />
              </button>
            ) : (
              <PlayerCard player={p} off={!p.active} size={desktop ? 11 : 10} />
            )}
            <Link to={`/jugador/${p.id}`} className="small -mt-1 text-xs underline-offset-2 hover:underline">
              Ver ficha
            </Link>
            <Switch
              checked={p.active}
              disabled={!isAdmin}
              onChange={(v) => void toggleActive(p, v)}
              label={p.active ? 'Convocado' : 'Convocar'}
              srLabel={p.name}
            />
          </motion.div>
        ))}
      </div>
    )
    const called = visible.filter((p) => p.active)
    const bench = visible.filter((p) => !p.active)
    content = (
      <LayoutGroup>
        <div className="flex flex-col gap-8">
          {called.length > 0 && (
            <section className="flex flex-col gap-3" aria-label="Convocados">
              <SectionHead title="Convocados" count={called.length} accent />
              {grid(called)}
            </section>
          )}
          {bench.length > 0 && (
            <section className="flex flex-col gap-3" aria-label="No convocados">
              <SectionHead title="No convocados" count={bench.length} />
              {grid(bench)}
            </section>
          )}
        </div>
      </LayoutGroup>
    )
  }

  return (
    <div className="flex gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-5">
        <PageHeader
          eyebrow={
            <span className="hidden lg:inline">
              {all.length} jugadores · {convCount} convocados
            </span>
          }
          title="Plantilla"
          right={
            <div className="flex items-center gap-2.5">
              <div className="search hidden w-[280px] lg:flex">
                <Search />
                <label className="sr" htmlFor="dk-q">
                  Buscar jugador
                </label>
                <input
                  id="dk-q"
                  className="input"
                  type="search"
                  placeholder="Buscar jugador"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                className="btn btn--glass hidden lg:inline-flex"
                type="button"
                onClick={() => setSort((s) => (s === 'rating' ? 'name' : 'rating'))}
              >
                <ArrowUpDown /> {sortLabel}
              </button>
              {addButton}
            </div>
          }
        />
        <p className="small -mt-2 lg:hidden">
          <span className="num">{all.length}</span> jugadores ·{' '}
          <strong className="neon num font-bold">{convCount}</strong> convocados
        </p>

        {isAdmin && !matches.loading && all.length > 0 && (
          <CalibrationButton matches={matches.data} players={all} />
        )}

        {!isAdmin && (
          <Banner tone="info" icon={<Info />}>
            Estás viendo como espectador.{' '}
            <Link to="/bienvenida" className="font-semibold text-[#cfe4ff] underline">
              Entra como admin
            </Link>{' '}
            para convocar, editar y sortear.
          </Banner>
        )}

        <div className="flex gap-2 lg:hidden">
          <div className="search flex-1">
            <Search />
            <label className="sr" htmlFor="pl-q">
              Buscar jugador
            </label>
            <input
              id="pl-q"
              className="input"
              type="search"
              placeholder="Buscar jugador"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className="btn btn--glass btn--icon size-12"
            type="button"
            aria-label={`Orden: ${sortLabel}`}
            title={sortLabel}
            onClick={() => setSort((s) => (s === 'rating' ? 'name' : 'rating'))}
          >
            <ArrowUpDown />
          </button>
        </div>

        <div
          className="no-scrollbar -mx-[18px] flex gap-2 overflow-x-auto px-[18px] lg:mx-0 lg:flex-wrap lg:px-0"
          role="group"
          aria-label="Filtrar"
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cx('pill', filter === f.id && 'pill--on')}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="eyebrow lg:hidden">Orden: {sortLabel}</p>

        {content}
      </div>

      {desktop && editing !== null && (
        <PlayerEditorPanel player={editingPlayer} onClose={() => setEditing(null)} />
      )}
      {!desktop && (
        <PlayerEditorSheet open={editing !== null} player={editingPlayer} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function SectionHead({ title, count, accent }: { title: string; count: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="h-display h-m">{title}</h2>
      <span className={`h-display num text-2xl ${accent ? 'neon' : 'text-[var(--muted)]'}`}>{count}</span>
      <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
    </div>
  )
}
