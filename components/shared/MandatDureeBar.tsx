'use client'

interface MandatDureeBarProps {
  date_debut: string
  date_fin: string | null
}

export function MandatDureeBar({ date_debut, date_fin }: MandatDureeBarProps) {
  if (!date_fin) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const debut = new Date(date_debut)
  const fin   = new Date(date_fin)
  debut.setHours(0, 0, 0, 0)
  fin.setHours(0, 0, 0, 0)

  const totalMs   = fin.getTime() - debut.getTime()
  const restantMs = fin.getTime() - today.getTime()
  const restantDays = Math.ceil(restantMs / 86400000)
  const isExpired   = restantDays <= 0

  const pct = isExpired
    ? 0
    : Math.min(100, Math.max(0, (restantMs / totalMs) * 100))

  const color = isExpired
    ? 'var(--brikii-border, #d1d5db)'
    : restantDays > 60
      ? '#22c55e'
      : restantDays > 30
        ? '#f59e0b'
        : '#ef4444'

  const textColor = isExpired ? 'var(--brikii-text-muted)' : color

  const label = isExpired
    ? 'Expiré'
    : restantDays === 1
      ? '1 jour restant'
      : `${restantDays} jours restants`

  return (
    <div className="flex flex-col gap-1">
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--brikii-bg-subtle, #f3f4f6)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs" style={{ color: textColor }}>{label}</span>
    </div>
  )
}
