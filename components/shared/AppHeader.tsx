'use client'

interface AppHeaderProps {
  title?:    string
  subtitle?: React.ReactNode
  back?:     React.ReactNode
  actions?:  React.ReactNode
}

export function AppHeader({ title, subtitle, back, actions }: AppHeaderProps) {
  return (
    <div className="shrink-0 flex items-center justify-between px-3 md:px-6 bg-[var(--brikii-bg)] border-b border-[var(--brikii-border)] mb-4 md:mb-6" style={{ minHeight: 'var(--brikii-header-h)' }}>
      <div className="flex flex-col gap-0.5 min-w-0 py-3">
        {back && <div>{back}</div>}
        {title && <h1 className="text-sm font-semibold text-[var(--brikii-text)] truncate">{title}</h1>}
        {subtitle && <div className="text-xs text-[var(--brikii-text-muted)]">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 ml-4">{actions}</div>}
    </div>
  )
}
