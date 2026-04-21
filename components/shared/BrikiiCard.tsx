interface BrikiiCardProps {
  children:   React.ReactNode
  className?: string
  padding?:   'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
}

export function BrikiiCard({ children, className = '', padding = 'md' }: BrikiiCardProps) {
  return (
    <div
      className={`bg-[var(--brikii-bg)] ${paddings[padding]} ${className}`}
      style={{
        borderRadius: 'var(--brikii-radius-card)',
        boxShadow:    'var(--brikii-shadow-card)',
      }}
    >
      {children}
    </div>
  )
}

export function BrikiiCardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function BrikiiCardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-semibold text-[var(--brikii-text)] ${className}`}>
      {children}
    </h3>
  )
}
