import { STAT_KEYS, STAT_LABELS, type Stats } from '@/domain/types'

const MIN = 50
const MAX = 100

/** Radar de las 6 stats medias de cada equipo superpuestas */
export function Radar({
  a,
  b,
  colorA,
  colorB,
  className,
}: {
  a: Stats
  b: Stats
  colorA: string
  colorB: string
  className?: string
}) {
  const size = 260
  const c = size / 2
  const r = c - 34
  const angle = (i: number) => (Math.PI * 2 * i) / STAT_KEYS.length - Math.PI / 2
  const point = (i: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)))
    return [c + Math.cos(angle(i)) * r * t, c + Math.sin(angle(i)) * r * t] as const
  }
  const polygon = (s: Stats) => STAT_KEYS.map((k, i) => point(i, s[k]).join(',')).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="Comparativa de stats medias"
    >
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon
          key={t}
          points={STAT_KEYS.map((_, i) =>
            [c + Math.cos(angle(i)) * r * t, c + Math.sin(angle(i)) * r * t].join(','),
          ).join(' ')}
          fill="none"
          stroke="rgb(148 163 184 / 0.18)"
        />
      ))}
      {STAT_KEYS.map((k, i) => {
        const [x, y] = [c + Math.cos(angle(i)) * (r + 18), c + Math.sin(angle(i)) * (r + 18)]
        return (
          <g key={k}>
            <line
              x1={c}
              y1={c}
              x2={c + Math.cos(angle(i)) * r}
              y2={c + Math.sin(angle(i)) * r}
              stroke="rgb(148 163 184 / 0.18)"
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#8b96b3"
              fontSize="11"
              fontWeight="700"
            >
              {STAT_LABELS[k]}
            </text>
          </g>
        )
      })}
      <polygon
        points={polygon(a)}
        fill={colorA}
        fillOpacity={0.25}
        stroke={colorA}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <polygon
        points={polygon(b)}
        fill={colorB}
        fillOpacity={0.25}
        stroke={colorB}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  )
}
