'use client'

import { useEffect } from 'react'

interface AppHeaderProps {
  title?:    string
  subtitle?: string
  actions?:  React.ReactNode
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <div className="shrink-0 flex items-center justify-between px-6 bg-[var(--brikii-bg)] border-b border-[var(--brikii-border)] mb-6" style={{ height: 'var(--brikii-header-h)' }}>
      <div>
        {title && <h1 className="text-sm font-semibold text-[var(--brikii-text)]">{title}</h1>}
        {subtitle && <p className="text-xs text-[var(--brikii-text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
