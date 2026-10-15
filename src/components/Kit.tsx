import { Shirt } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cx } from '@/lib/cx'

/** Camisetas: el equipo A (arriba en el campo) juega de rojo y el B (abajo), de azul. Igual que .team-red/.team-blue */
const KITS = {
  A: { color: '#ef4444', name: 'rojo' },
  B: { color: '#3b82f6', name: 'azul' },
} as const

/** Camiseta pequeña del color con el que juega el equipo */
export function Kit({
  side,
  className,
  style,
}: {
  side: 'A' | 'B'
  className?: string
  style?: CSSProperties
}) {
  const kit = KITS[side]
  return (
    <Shirt
      className={cx('shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,.45)]', className ?? 'size-4')}
      style={{ color: kit.color, ...style }}
      fill="currentColor"
      stroke="rgba(255,255,255,.75)"
      strokeWidth={1.5}
      role="img"
      aria-label={`Juega de ${kit.name}`}
    >
      <title>{`Juega de ${kit.name}`}</title>
    </Shirt>
  )
}
