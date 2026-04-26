'use client'

import { useEffect, useRef, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { BrikiiButton } from '@/components/shared/BrikiiButton'

export interface ContactResult {
  id: string
  personne_type: string
  civilite?: string | null
  prenom?: string | null
  nom?: string | null
  raison_sociale?: string | null
  email?: string | null
  telephone?: string | null
}

interface ContactPickerProps {
  onSelect: (contact: ContactResult) => void
  placeholder?: string
  disabled?: boolean
}

function contactLabel(c: ContactResult) {
  if (c.personne_type === 'morale') return c.raison_sociale ?? '—'
  return [c.prenom, c.nom].filter(Boolean).join(' ') || c.email || '—'
}

export function ContactPicker({ onSelect, placeholder = 'Rechercher un contact…', disabled }: ContactPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ContactResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newPrenom, setNewPrenom] = useState('')
  const [newTel, setNewTel] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?q=${encodeURIComponent(query)}&limit=8`)
        if (!res.ok) return
        const data = await res.json() as ContactResult[]
        setResults(data)
        setOpen(data.length > 0 || query.length >= 2)
        setActiveIndex(-1)
      } catch { /* ignore */ }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function pick(c: ContactResult) {
    onSelect(c)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      pick(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  async function handleCreate() {
    if (!newNom.trim() && !newPrenom.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personne_type: 'physique',
          prenom: newPrenom.trim() || undefined,
          nom: newNom.trim() || undefined,
          telephone: newTel.trim() || undefined,
          email: newEmail.trim() || undefined,
        }),
      })
      const data = await res.json() as ContactResult & { error?: unknown }
      if (!res.ok) {
        setCreateError(typeof data.error === 'string' ? data.error : 'Erreur lors de la création')
        return
      }
      pick(data)
      setShowCreateForm(false)
      setNewNom('')
      setNewPrenom('')
      setNewTel('')
      setNewEmail('')
    } catch {
      setCreateError('Erreur réseau')
    } finally {
      setCreating(false)
    }
  }

  if (showCreateForm) {
    return (
      <div className="flex flex-col gap-2 p-3 border border-[var(--brikii-border)] rounded" style={{ borderRadius: 'var(--brikii-radius-card)' }}>
        <p className="text-xs font-medium text-[var(--brikii-text)]">Nouveau contact</p>
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            placeholder="Prénom"
            value={newPrenom}
            onChange={e => setNewPrenom(e.target.value)}
            className="flex-1 h-8 px-2 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
            style={{ borderRadius: 'var(--brikii-radius-input)' }}
          />
          <input
            type="text"
            placeholder="Nom *"
            value={newNom}
            onChange={e => setNewNom(e.target.value)}
            className="flex-1 h-8 px-2 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
            style={{ borderRadius: 'var(--brikii-radius-input)' }}
          />
        </div>
        <input
          type="tel"
          placeholder="Téléphone"
          value={newTel}
          onChange={e => setNewTel(e.target.value)}
          className="h-8 px-2 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
          style={{ borderRadius: 'var(--brikii-radius-input)' }}
        />
        <input
          type="email"
          placeholder="Email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          className="h-8 px-2 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
          style={{ borderRadius: 'var(--brikii-radius-input)' }}
        />
        {createError && <p className="text-xs text-[var(--brikii-danger)]">{createError}</p>}
        <div className="flex gap-2">
          <BrikiiButton size="sm" loading={creating} onClick={handleCreate} disabled={!newNom.trim() && !newPrenom.trim()}>
            Créer
          </BrikiiButton>
          <BrikiiButton variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
            Annuler
          </BrikiiButton>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] placeholder:text-[var(--brikii-text-muted)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors disabled:opacity-50"
          style={{ borderRadius: 'var(--brikii-radius-input)' }}
        />
        {open && (
          <ul
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--brikii-bg)] border border-[var(--brikii-border)] shadow-lg overflow-hidden"
            style={{ borderRadius: 'var(--brikii-radius-card)' }}
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--brikii-text-muted)]">Aucun résultat</li>
            ) : results.map((c, i) => (
              <li
                key={c.id}
                onMouseDown={() => pick(c)}
                className={[
                  'px-3 py-2 text-sm cursor-pointer transition-colors',
                  i === activeIndex
                    ? 'bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)]'
                    : 'text-[var(--brikii-text)] hover:bg-[var(--brikii-bg-subtle)]',
                ].join(' ')}
              >
                <span className="font-medium">{contactLabel(c)}</span>
                {c.telephone && <span className="ml-2 text-[var(--brikii-text-muted)]">{c.telephone}</span>}
                {c.email && !c.telephone && <span className="ml-2 text-[var(--brikii-text-muted)]">{c.email}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        title="Créer un nouveau contact"
        disabled={disabled}
        onClick={() => setShowCreateForm(true)}
        className="h-9 w-9 flex items-center justify-center border border-[var(--brikii-border)] text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] hover:border-[var(--brikii-dark)] transition-colors disabled:opacity-50"
        style={{ borderRadius: 'var(--brikii-radius-input)' }}
      >
        <UserPlus className="w-4 h-4" />
      </button>
    </div>
  )
}
