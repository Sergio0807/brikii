'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface BrikiiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     React.ReactNode
}

const base = [
  'inline-flex items-center justify-center gap-2 font-medium transition-all',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:opacity-50 disabled:pointer-events-none',
].join(' ')

const variants: Record<Variant, string> = {
  primary:   'bg-[var(--brikii-yellow)] text-[var(--brikii-dark)] hover:bg-[var(--brikii-yellow-hover)] focus-visible:ring-[var(--brikii-yellow)]',
  secondary: 'bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)] border border-[var(--brikii-border)] hover:bg-gray-100',
  ghost:     'bg-transparent text-[var(--brikii-text-muted)] hover:bg-[var(--brikii-bg-subtle)] hover:text-[var(--brikii-text)]',
  danger:    'bg-[var(--brikii-danger-bg)] text-[var(--brikii-danger)] hover:bg-red-100 border border-[var(--brikii-danger)]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-[var(--brikii-radius-btn)]',
  md: 'h-9 px-4 text-sm rounded-[var(--brikii-radius-btn)]',
  lg: 'h-11 px-6 text-sm rounded-[var(--brikii-radius-btn)]',
}

export const BrikiiButton = forwardRef<HTMLButtonElement, BrikiiButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? <LoadingSpinner size="sm" /> : icon}
        {children}
      </button>
    )
  }
)

BrikiiButton.displayName = 'BrikiiButton'
