import type { When } from '@/lib/when'

export function MatchWhenFields({ value, onChange }: { value: When; onChange: (w: When) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="field">
        <label htmlFor="when-date">Fecha</label>
        <input
          id="when-date"
          className="input"
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="when-time">Hora</label>
        <input
          id="when-time"
          className="input"
          type="time"
          value={value.time}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
        />
      </div>
      <div className="field col-span-2">
        <label htmlFor="when-place">Campo</label>
        <input
          id="when-place"
          className="input"
          maxLength={60}
          placeholder="Ej. Polideportivo municipal"
          value={value.place}
          onChange={(e) => onChange({ ...value, place: e.target.value })}
        />
      </div>
    </div>
  )
}
