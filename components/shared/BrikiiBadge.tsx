type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'yellow'

interface BrikiiBadgeProps {
  children:   React.ReactNode
  variant?:   Variant
  className?: string
}

const variants: Record<Variant, string> = {
  success: 'bg-[var(--brikii-success-bg)] text-[var(--brikii-success)]',
  warning: 'bg-[var(--brikii-warning-bg)] text-[var(--brikii-warning)]',
  danger:  'bg-[var(--brikii-danger-bg)]  text-[var(--brikii-danger)]',
  info:    'bg-[var(--brikii-info-bg)]    text-[var(--brikii-info)]',
  neutral: 'bg-[var(--brikii-bg-subtle)]  text-[var(--brikii-text-muted)]',
  yellow:  'bg-[var(--brikii-yellow)]     text-[var(--brikii-dark)]',
}

export function BrikiiBadge({ children, variant = 'neutral', className = '' }: BrikiiBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
