import { useState } from 'react'

export type SortDir = 1 | -1

/** Orden de una tabla: tocar una columna ordena por ella (de más a menos); otra vez, al revés */
export function useSort<K extends string>(initial: K) {
  const [sort, setSort] = useState<{ key: K; dir: SortDir }>({ key: initial, dir: -1 })
  const pick = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir as SortDir } : { key, dir: -1 }))
  const aria = (key: K) =>
    (sort.key === key ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none') as
      'descending' | 'ascending' | 'none'
  return { ...sort, pick, aria }
}
