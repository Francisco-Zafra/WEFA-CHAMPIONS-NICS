import { Plus, Search, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { PlayerCard } from '@/components/PlayerCard'
import { PlayerEditor } from '@/components/PlayerEditor'
import { useToast } from '@/components/Toast'
import { Button, EmptyState, Segmented, SectionTitle, Spinner, Toggle } from '@/components/ui'
import { averageRating, overall } from '@/domain/rating'
import type { Player } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { setPlayersActive, updatePlayer, type Collection } from '@/lib/data'

type Filter = 'all' | 'active' | 'bench'
type Sort = 'rating' | 'name'

export function SquadPage({ players }: { players: Collection<Player> }) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('rating')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Player | null>(null)
  const [creating, setCreating] = useState(false)

  const all = players.data
  const active = all.filter((p) => p.active)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((p) => (filter === 'all' ? true : filter === 'active' ? p.active : !p.active))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name, 'es')
          : overall(b.stats) - overall(a.stats) || a.name.localeCompare(b.name),
      )
  }, [all, filter, sort, query])

  async function toggleActive(p: Player, active: boolean) {
    try {
      await updatePlayer(p.id, { active })
    } catch {
      toast('No se pudo actualizar', 'error')
    }
  }

  async function bulk(active: boolean) {
    const ids = visible.filter((p) => p.active !== active).map((p) => p.id)
    if (ids.length === 0) return
    try {
      await setPlayersActive(ids, active)
      toast(active ? `${ids.length} convocados` : `${ids.length} al banquillo`)
    } catch {
      toast('No se pudo actualizar', 'error')
    }
  }

  return (
    <div>
      <SectionTitle
        kicker="Temporada 3.0"
        title="Plantilla"
        right={
          isAdmin && (
            <Button variant="primary" onClick={() => setCreating(true)} className="hidden sm:inline-flex">
              <Plus className="size-4" /> Fichar
            </Button>
          )
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Plantilla" value={all.length} />
        <Stat label="Convocados" value={active.length} accent />
        <Stat label="Media conv." value={active.length ? averageRating(active).toFixed(1) : '–'} />
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <label className="border-line focus-within:border-accent flex h-11 flex-1 items-center gap-2 rounded-xl border bg-white/5 px-3">
          <Search className="text-muted size-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador…"
            className="w-full bg-transparent outline-none"
            aria-label="Buscar jugador"
          />
        </label>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Convocados' },
            { value: 'bench', label: 'Banquillo' },
          ]}
        />
        <Segmented<Sort>
          value={sort}
          onChange={setSort}
          options={[
            { value: 'rating', label: 'Media' },
            { value: 'name', label: 'A–Z' },
          ]}
        />
      </div>

      {isAdmin && visible.length > 0 && (
        <div className="mb-4 flex gap-2">
          <Button size="sm" onClick={() => void bulk(true)}>
            Convocar {filter === 'all' && !query ? 'a todos' : 'visibles'}
          </Button>
          <Button size="sm" onClick={() => void bulk(false)}>
            Al banquillo
          </Button>
        </div>
      )}

      {players.loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-10" />
        </div>
      ) : players.error ? (
        <EmptyState icon="📡" title="Sin señal">
          No se pudo cargar la plantilla. Revisa tu conexión o las reglas de Firestore.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Users className="mx-auto size-12" />}
          title={all.length ? 'Nadie por aquí' : 'Plantilla vacía'}
        >
          {all.length
            ? 'Prueba con otro filtro o búsqueda.'
            : isAdmin
              ? 'Ficha a tu primer jugador.'
              : 'El admin aún no ha fichado a nadie.'}
        </EmptyState>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <PlayerCard
                player={p}
                dimmed={!p.active}
                onClick={isAdmin ? () => setEditing(p) : undefined}
                footer={
                  isAdmin ? (
                    <div className="flex items-center justify-between rounded-xl bg-black/15 px-2.5 py-1.5">
                      <span className="text-[11px] font-bold tracking-wider uppercase">
                        {p.active ? 'Convocado' : 'Banquillo'}
                      </span>
                      <Toggle
                        label={`Convocar a ${p.name}`}
                        checked={p.active}
                        onChange={(v) => void toggleActive(p, v)}
                      />
                    </div>
                  ) : undefined
                }
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {isAdmin && (
        <button
          type="button"
          aria-label="Fichar jugador"
          onClick={() => setCreating(true)}
          className="bg-accent text-night-950 shadow-accent/50 fixed right-4 bottom-24 z-30 flex size-14 items-center justify-center rounded-2xl shadow-lg transition active:scale-95 sm:hidden"
        >
          <Plus className="size-7" />
        </button>
      )}

      <PlayerEditor
        open={creating || editing !== null}
        player={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="panel px-3 py-3 sm:px-4">
      <p className="label">{label}</p>
      <p className={`display mt-1 text-4xl ${accent ? 'text-accent' : ''}`}>{value}</p>
    </div>
  )
}
