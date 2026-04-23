'use client'

import { useEffect, useRef, useState } from 'react'

interface AdresseSuggestion {
  label: string
  name: string
  postcode: string
  city: string
}

interface AdresseAutocompleteProps {
  label?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: AdresseSuggestion) => void
  placeholder?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_ADRESSE_URL ?? 'https://api-adresse.data.gouv.fr'

export function AdresseAutocomplete({
  label,
  required,
  value,
  onChange,
  onSelect,
  placeholder = '12 rue des Lilas',
}: AdresseAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AdresseSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 3) {
      debounceRef.current = setTimeout(() => { setSuggestions([]); setOpen(false) }, 0)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/search/?q=${encodeURIComponent(value)}&limit=5`)
        if (!res.ok) return
        const data = await res.json() as { features: { properties: AdresseSuggestion }[] }
        const results = data.features.map(f => f.properties)
        setSuggestions(results)
        setOpen(results.length > 0)
        setActiveIndex(-1)
      } catch { /* silently ignore */ }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      pick(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function pick(s: AdresseSuggestion) {
    onSelect(s)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1 relative">
      {label && (
        <label className="text-xs font-medium text-[var(--brikii-text)]">
          {label}
          {required && <span className="text-[var(--brikii-danger)] ml-0.5">*</span>}
        </label>
      )}
      <input
        type="text"
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={[
          'w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)]',
          'placeholder:text-[var(--brikii-text-muted)]',
          'border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)]',
          'transition-colors outline-none',
        ].join(' ')}
        style={{ borderRadius: 'var(--brikii-radius-input)' }}
      />
      {open && (
        <ul
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--brikii-bg)] border border-[var(--brikii-border)] shadow-lg overflow-hidden"
          style={{ borderRadius: 'var(--brikii-radius-card)' }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.label}
              onMouseDown={() => pick(s)}
              className={[
                'px-3 py-2 text-sm cursor-pointer transition-colors',
                i === activeIndex
                  ? 'bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)]'
                  : 'text-[var(--brikii-text)] hover:bg-[var(--brikii-bg-subtle)]',
              ].join(' ')}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
