import { useMemo, useState } from 'react'
import { CalibrationList } from '@/components/Calibration'
import { drawQuality, verdict } from '@/domain/insights'
import { fmt } from '@/domain/rating'
import type { Player } from '@/domain/types'
import { useAuth } from '@/lib/auth'
import { useShowMatches, type StatsData } from '@/hooks/useStatsData'
import { BlockHead, SubSeg } from './bits'

const VERDICT = {
  yes: { title: 'Sí, funciona', cls: '', color: '#9FF3CF' },
  meh: { title: 'Más o menos', cls: 'verdict--meh', color: '#FFE3A6' },
  no: { title: 'Hay que afinarlo', cls: 'verdict--no', color: '#FFC2C9' },
} as const

const BUCKETS = ['Empate', '1 gol', '2 goles', '3 goles', '4 o más']
const BUCKET_COLOR = ['#3BE3A0', '#3BE3A0', '#9B7BFF', '#9B7BFF', '#FF5A6A']

export function DrawSection({
  data,
  players,
  desktop,
}: {
  data: StatsData
  players: Player[]
  desktop: boolean
}) {
  const { filtered } = data
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<'res' | 'rep' | 'cal'>('res')
  const show = useShowMatches()
  const q = useMemo(() => drawQuality(filtered), [filtered])
  const v = verdict(q)
  const withTeams = filtered.filter((m) => m.teamA.length > 0 && m.teamB.length > 0)
  const close = q.played ? q.close / q.played : 0
  const bucketMatches = (i: number) =>
    withTeams.filter((m) => Math.min(Math.abs(m.scoreA! - m.scoreB!), 4) === i)

  if (q.played === 0)
    return (
      <p className="body-text py-6">
        Hace falta algún partido con equipos y resultado para saber si el sorteo funciona.
      </p>
    )

  const summary = (
    <>
      {v && (
        <section className={`verdict ${VERDICT[v].cls}`}>
          <p className="eyebrow" style={{ color: VERDICT[v].color }}>
            El veredicto
          </p>
          <h2 className="h-display" style={{ fontSize: desktop ? 44 : 38 }}>
            {VERDICT[v].title}
          </h2>
          <p className="body-text text-sm">
            {Math.round(close * 10)} de cada 10 partidos se deciden por un gol o acaban en empate.
          </p>
        </section>
      )}
      <div
        className="kpis"
        style={desktop ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } : undefined}
      >
        <button
          className="kpi2 rowbtn"
          type="button"
          onClick={() =>
            show(
              withTeams.filter((m) => Math.abs(m.scoreA! - m.scoreB!) <= 1),
              'Partidos igualados',
            )
          }
        >
          <b style={{ color: 'var(--win)' }}>{Math.round(close * 100)} %</b>
          <span>Igualados</span>
          <em>
            {q.close} de {q.played} · por 0 o 1 gol
          </em>
        </button>
        <div className="kpi2">
          <b>{fmt(q.avgMargin)}</b>
          <span>Diferencia media</span>
          <em>goles por partido</em>
        </div>
        <div className="kpi2">
          <b>{q.decided ? `${Math.round((q.favoriteWon / q.decided) * 100)} %` : '–'}</b>
          <span>Gana el favorito</span>
          <em>
            {q.favoriteWon} de {q.decided} con favorito claro
          </em>
        </div>
        <div className="kpi2">
          <b>{fmt(q.avgGap)}</b>
          <span>Diferencia de medias</span>
          <em>al sortear</em>
        </div>
      </div>
    </>
  )

  const max = Math.max(1, ...q.margins)
  const histogram = (
    <>
      <BlockHead
        small
        title="Por cuánto se gana"
        note={desktop ? 'Toca una barra para ver esos partidos' : undefined}
      />
      <div
        className="hist"
        role="img"
        aria-label={BUCKETS.map((b, i) => `${b}: ${q.margins[i]} partidos`).join('; ')}
      >
        {q.margins.map((n, i) => (
          <button
            key={i}
            className="hcol"
            type="button"
            onClick={() => show(bucketMatches(i), i === 0 ? 'Empates' : `Ganados por ${BUCKETS[i]}`)}
          >
            <b>{n}</b>
            <i style={{ height: `${(n / max) * 100}%`, background: BUCKET_COLOR[i] }} />
            <span>{desktop ? BUCKETS[i] : BUCKETS[i]!.replace(' goles', '').replace('4 o más', '4+')}</span>
          </button>
        ))}
      </div>
      <p className="note">Verde: igualados. Rojo: goleadas. Toca una barra para ver esos partidos.</p>
    </>
  )

  const calibration = <CalibrationList matches={filtered} players={players} />

  if (desktop)
    return (
      <div className="flex flex-col gap-6">
        {summary}
        <div className="grid items-start gap-8 @4xl:grid-cols-2">
          <section className="flex flex-col gap-3">{histogram}</section>
          {isAdmin && (
            <section className="flex flex-col gap-2">
              <div className="card__h">
                <h2 className="h-display h-s">Calibrar medias</h2>
                <span className="adm">Solo admin</span>
              </div>
              {calibration}
            </section>
          )}
        </div>
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      <SubSeg
        label="Apartados"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'res', label: 'Resumen' },
          { value: 'rep', label: 'Reparto' },
          ...(isAdmin
            ? [
                {
                  value: 'cal' as const,
                  label: (
                    <>
                      Calibrar<span className="adm adm--sm">admin</span>
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />
      {tab === 'res' && summary}
      {tab === 'rep' && histogram}
      {tab === 'cal' && isAdmin && calibration}
    </div>
  )
}
