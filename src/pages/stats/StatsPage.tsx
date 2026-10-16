import { FilterX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/States'
import type { Cup } from '@/domain/cup'
import { clearFilter, relaxations } from '@/domain/filters'
import type { Match, Player } from '@/domain/types'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useStatsData, type StatsData } from '@/hooks/useStatsData'
import type { Collection } from '@/lib/data'
import { useStatsFilter } from '@/lib/statsFilter'
import { ClubsSection } from './ClubsSection'
import { CompareSection } from './CompareSection'
import { DrawSection } from './DrawSection'
import { FilterButton, FilterChips, FilterCount, FilterPanel, FilterSheet } from './Filters'
import { PlayersSection } from './PlayersSection'
import { RecordsSection } from './RecordsSection'
import { ScorersSection } from './ScorersSection'

const SECTIONS = [
  { id: 'jugadores', label: 'Jugadores' },
  { id: 'goleadores', label: 'Goleadores' },
  { id: 'clubes', label: 'Clubes' },
  { id: 'comparar', label: 'Comparar' },
  { id: 'records', label: 'Récords' },
  { id: 'sorteo', label: '¿Funciona el sorteo?' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/** Con un filtro que deja sin partidos: propone quitar el último */
function NoMatches({ data, matches, desktop }: { data: StatsData; matches: Match[]; desktop: boolean }) {
  const options = relaxations(matches, data.filter, data.names, data.now)
  const first = options[0]
  const labels = data.chips.map((c) => `«${c.label}»`).join(' · ')
  return (
    <div className="empty mx-auto max-w-[520px]" style={desktop ? { padding: '48px 24px' } : undefined}>
      <span className="empty__ic">
        <FilterX />
      </span>
      <h3 className="h-display" style={{ fontSize: desktop ? 44 : 32 }}>
        Ni un partido
      </h3>
      <p className="body-text text-sm">Ningún partido cumple a la vez {labels}.</p>
      <div className="flex w-full flex-col gap-2">
        {first && (
          <button
            className="btn btn--primary w-full"
            type="button"
            onClick={() => data.setFilter(first.filter)}
          >
            Quitar «{first.chip.label}»
          </button>
        )}
        <button
          className="fclear self-center"
          type="button"
          onClick={() => data.setFilter(clearFilter(data.filter))}
        >
          Quitar todos los filtros
        </button>
      </div>
      {first && !desktop && (
        <p className="note">
          Sin «{first.chip.label}» hay {first.count} {first.count === 1 ? 'partido' : 'partidos'}.
        </p>
      )}
      {desktop && options.length > 0 && (
        <div className="mt-3 flex w-full flex-col gap-2">
          <p className="eyebrow text-left">Lo más parecido con partidos</p>
          {options.slice(0, 3).map((o) => (
            <button key={o.chip.key} className="sugg" type="button" onClick={() => data.setFilter(o.filter)}>
              <span>
                Sin <strong>«{o.chip.label}»</strong>
              </span>
              <strong>
                {o.count} {o.count === 1 ? 'partido' : 'partidos'}
              </strong>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatsPage({
  players,
  matches,
  cups,
}: {
  players: Collection<Player>
  /** Amistosos y cruces de copa jugados, con el MVP resuelto */
  matches: Collection<Match>
  cups: Collection<Cup>
}) {
  const { section } = useParams()
  const desktop = useIsDesktop()
  const { panel, setPanel } = useStatsFilter()
  const [sheet, setSheet] = useState(false)
  const tabsRef = useRef<HTMLElement>(null)
  const data = useStatsData(matches.data, players.data, cups.data)
  const current = SECTIONS.find((s) => s.id === section)?.id
  // En móvil las pestañas se desplazan: la activa, siempre a la vista
  useEffect(() => {
    tabsRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [current])
  if (!current) return <Navigate to="/estadisticas/jugadores" replace />

  if (matches.error || players.error)
    return (
      <ErrorState title="Se ha ido la luz del estadio">
        No hemos podido cargar los datos. Revisa tu conexión e inténtalo de nuevo.
      </ErrorState>
    )

  const loading = matches.loading || players.loading || cups.loading
  const props = { data, players: players.data, desktop }
  const body: Record<SectionId, React.ReactNode> = {
    jugadores: <PlayersSection {...props} />,
    goleadores: <ScorersSection {...props} />,
    clubes: <ClubsSection data={data} cups={cups.data} desktop={desktop} />,
    comparar: <CompareSection {...props} cups={cups.data} />,
    records: <RecordsSection {...props} />,
    sorteo: <DrawSection {...props} />,
  }
  const tabs = (
    <nav
      ref={tabsRef}
      className="subtabs -mx-[18px] px-2 lg:mx-0 lg:px-0"
      aria-label="Secciones de Estadísticas"
    >
      {SECTIONS.map((s) => (
        <Link
          key={s.id}
          className="subtab"
          to={`/estadisticas/${s.id}`}
          aria-current={s.id === current ? 'page' : undefined}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  )
  const content = loading ? (
    <div className="flex flex-col gap-2.5" aria-busy="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="skel h-[44px] rounded-xl" />
      ))}
    </div>
  ) : data.filtered.length === 0 ? (
    <NoMatches data={data} matches={matches.data} desktop={desktop} />
  ) : (
    body[current]
  )

  if (desktop)
    return (
      <div className="flex flex-col gap-[18px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Amistosos y copa juntos</p>
            <h1 className="h-display mt-1.5 text-[56px]">Estadísticas</h1>
          </div>
          <FilterCount data={data} className="text-sm" />
        </header>
        {tabs}
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterButton count={data.chips.length} onClick={() => setPanel(!panel)} />
          <FilterChips data={data} />
          {data.chips.length > 0 && (
            <button className="fclear" type="button" onClick={() => data.setFilter(clearFilter(data.filter))}>
              Quitar filtros
            </button>
          )}
        </div>
        <div className="flex items-start gap-6">
          <div className="@container min-w-0 flex-1">{content}</div>
          {panel && (
            <FilterPanel data={data} matches={matches.data} players={players.data} cups={cups.data} />
          )}
        </div>
      </div>
    )

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h1 className="h-display h-l">Estadísticas</h1>
        <FilterButton count={data.chips.length} onClick={() => setSheet(true)} />
      </div>
      {tabs}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        <FilterChips data={data} />
        <FilterCount data={data} className="ml-auto shrink-0 pl-2" />
      </div>
      {content}
      <FilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        data={data}
        matches={matches.data}
        players={players.data}
        cups={cups.data}
      />
    </div>
  )
}
