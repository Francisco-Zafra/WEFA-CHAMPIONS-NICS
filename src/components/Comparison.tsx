import type { TeamSummary } from '@/domain/balance'
import { fmt, statScale } from '@/domain/rating'
import { STAT_KEYS, STAT_LABELS, type Club, type Stats } from '@/domain/types'

export function Radar({
  a,
  b,
  clubA,
  clubB,
  bare,
}: {
  a: TeamSummary
  b: TeamSummary
  clubA: Club
  clubB: Club
  /** Sin leyenda ni nota de escala */
  bare?: boolean
}) {
  const [lo, hi] = statScale(a.stats, b.stats)
  const R = 100
  const C = { x: 130, y: 120 }
  const angle = (i: number) => (Math.PI * 2 * i) / STAT_KEYS.length - Math.PI / 2
  const pt = (i: number, t: number) =>
    [C.x + Math.cos(angle(i)) * R * t, C.y + Math.sin(angle(i)) * R * t] as const
  const norm = (v: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
  const ring = (t: number) => STAT_KEYS.map((_, i) => pt(i, t).join(',')).join(' ')
  const poly = (s: Stats) => STAT_KEYS.map((k, i) => pt(i, norm(s[k])).join(',')).join(' ')
  const describe = (name: string, s: Stats) =>
    `${name} ${STAT_KEYS.map((k) => `${STAT_LABELS[k]} ${fmt(s[k])}`).join(', ')}`

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox="0 0 280 262"
        className="mx-auto h-auto w-full max-w-[340px]"
        role="img"
        aria-label={`Radar de stats medias: ${describe(clubA.name, a.stats)}; ${describe(clubB.name, b.stats)}`}
      >
        <g transform="translate(10,12)" fontFamily="Geist Variable, system-ui, sans-serif">
          <polygon points={ring(1)} fill="rgba(255,255,255,.03)" stroke="rgba(170,190,255,.22)" />
          <polygon points={ring(0.5)} fill="none" stroke="rgba(170,190,255,.16)" strokeDasharray="3 3" />
          <path
            d={STAT_KEYS.map((_, i) => `M${C.x} ${C.y}L${pt(i, 1).join(' ')}`).join('')}
            stroke="rgba(170,190,255,.14)"
          />
          <text x={C.x + 4} y={C.y - R - 3} fontSize="9" fill="#6F7BA0">
            {hi}
          </text>
          <text x={C.x + 4} y={C.y - R / 2 - 3} fontSize="9" fill="#6F7BA0">
            {(lo + hi) / 2}
          </text>
          <polygon
            points={poly(a.stats)}
            fill={`${clubA.primary}38`}
            stroke={clubA.primary}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <polygon
            points={poly(b.stats)}
            fill={`${clubB.primary}33`}
            stroke={clubB.primary}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          <g fontSize="12" fontWeight="700" fill="#C3CCE6" letterSpacing=".06em">
            {STAT_KEYS.map((k, i) => {
              const [x, y] = pt(i, 1.16)
              const anchor = Math.abs(x - C.x) < 1 ? 'middle' : x > C.x ? 'start' : 'end'
              return (
                <text key={k} x={x} y={y + 4} textAnchor={anchor}>
                  {STAT_LABELS[k]}
                </text>
              )
            })}
          </g>
        </g>
      </svg>
      {!bare && (
        <>
          <RadarLegend clubA={clubA} clubB={clubB} className="justify-center" />
          <p className="small text-center text-[11px]">
            Escala ampliada {lo}–{hi} para que se vean las diferencias.
          </p>
        </>
      )}
    </div>
  )
}

/** Leyenda: A con línea continua, B discontinua */
export function RadarLegend({ clubA, clubB, className }: { clubA: Club; clubB: Club; className?: string }) {
  return (
    <div className={`flex gap-[18px] text-xs text-[var(--ink-2)] ${className ?? ''}`}>
      <span className="flex items-center gap-1.5">
        <i className="h-[3px] w-[18px] rounded" style={{ background: clubA.primary }} />
        {clubA.name}
      </span>
      <span className="flex items-center gap-1.5">
        <i className="w-[18px] border-t-[3px] border-dashed" style={{ borderColor: clubB.primary }} />
        {clubB.name}
      </span>
    </div>
  )
}

export function StatRows({
  a,
  b,
  clubA,
  clubB,
}: {
  a: TeamSummary
  b: TeamSummary
  clubA: Club
  clubB: Club
}) {
  const [lo, hi] = statScale(a.stats, b.stats)
  const pct = (v: number) => `${Math.max(4, ((v - lo) / (hi - lo)) * 100)}%`
  return (
    <div className="flex flex-col gap-2">
      {STAT_KEYS.map((k) => {
        const va = a.stats[k]
        const vb = b.stats[k]
        return (
          <div key={k} className="srow">
            <span
              className="num"
              style={{ fontWeight: va > vb ? 700 : 500, color: va > vb ? clubA.primary : '#C3CCE6' }}
            >
              {fmt(va)}
            </span>
            <div className="sbar" style={{ direction: 'rtl' }}>
              <i style={{ right: 0, width: pct(va), background: clubA.primary }} />
            </div>
            <span className="text-center text-[11px] font-bold tracking-[.08em] text-[var(--muted)]">
              {STAT_LABELS[k]}
            </span>
            <div className="sbar">
              <i style={{ left: 0, width: pct(vb), background: clubB.primary }} />
            </div>
            <span
              className="num text-right"
              style={{ fontWeight: vb > va ? 700 : 500, color: vb > va ? clubB.primary : '#C3CCE6' }}
            >
              {fmt(vb)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
