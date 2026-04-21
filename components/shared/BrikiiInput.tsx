'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'

interface BrikiiInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
  icon?:    React.ReactNode
}

export const BrikiiInput = forwardRef<HTMLInputElement, BrikiiInputProps>(
  ({ label, error, hint, icon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-[var(--brikii-text)]">
            {label}
            {props.required && <span className="text-[var(--brikii-danger)] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brikii-text-muted)] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={[
              'w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)]',
              'placeholder:text-[var(--brikii-text-muted)]',
              'transition-colors outline-none',
              'border disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-[var(--brikii-danger)] focus:border-[var(--brikii-danger)]'
                : 'border-[var(--brikii-border)] focus:border-[var(--brikii-dark)]',
              icon ? 'pl-9' : '',
              className,
            ].join(' ')}
            style={{ borderRadius: 'var(--brikii-radius-input)' }}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--brikii-text-muted)]">{hint}</p>}
      </div>
    )
  }
)

BrikiiInput.displayName = 'BrikiiInput'
