import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Outcome } from '@/domain/standings'
import { cx } from '@/lib/cx'

const FORM: Record<Outcome, { c: string; t: string }> = {
  W: { c: 'w', t: 'V' },
  D: { c: 'd', t: 'E' },
  L: { c: 'l', t: 'D' },
}

/** Últimos resultados (V/E/D), del más antiguo al más reciente */
export function FormDots({ form, className }: { form: Outcome[]; className?: string }) {
  return (
    <span
      className={cx('form', className)}
      aria-label={`Últimos resultados: ${form.map((o) => FORM[o].t).join(' ')}`}
    >
      {form.map((o, i) => (
        <i key={i} className={FORM[o].c}>
          {FORM[o].t}
        </i>
      ))}
    </span>
  )
}

/** Cabecera ordenable de una tabla .st */
export function SortTh({
  label,
  sort,
  onSort,
  left,
}: {
  label: string
  sort: 'ascending' | 'descending' | 'none'
  onSort: () => void
  left?: boolean
}) {
  return (
    <th scope="col" aria-sort={sort} style={left ? { textAlign: 'left' } : undefined}>
      <button type="button" onClick={onSort} style={left ? { paddingLeft: 4 } : undefined}>
        {label}
      </button>
    </th>
  )
}

/** Apartados dentro de una sección (subrayados) */
export function SubSeg<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
}) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-pressed={value === o.value}
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SearchBox({
  id,
  value,
  onChange,
  className,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={cx('search', className)}>
      <Search aria-hidden />
      <label className="sr" htmlFor={id}>
        Buscar jugador
      </label>
      <input
        id={id}
        className="input"
        type="search"
        placeholder="Buscar jugador"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 42 }}
      />
    </div>
  )
}

/** Título de bloque con nota a la derecha */
export function BlockHead({ title, note, small }: { title: ReactNode; note?: ReactNode; small?: boolean }) {
  return (
    <div className="card__h">
      <h2 className={cx('h-display', small ? 'h-s' : 'h-m')}>{title}</h2>
      {note && <span className="note text-right">{note}</span>}
    </div>
  )
}
