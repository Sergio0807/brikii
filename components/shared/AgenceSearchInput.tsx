'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Building2, X, Search, Loader2 } from 'lucide-react'
import { BrikiiInput } from './BrikiiInput'
import { BrikiiButton } from './BrikiiButton'

export interface Agence {
  id?:       string
  nom:       string
  ville?:    string | null
  siret?:    string | null
  logo_url?: string | null
  source?:   string
}

interface AgenceSearchInputProps {
  onSelect:      (agence: Agence | null) => void
  defaultValue?: Agence | null
  placeholder?:  string
  disabled?:     boolean
}

// ── Modal demande ──────────────────────────────────────────────────────────────

function DemandeModal({ onClose }: { onClose: () => void }) {
  const [siret, setSiret]         = useState('')
  const [siretData, setSiretData] = useState<{ nom: string; ville: string } | null>(null)
  const [siretError, setSiretError] = useState('')
  const [siretLoading, setSiretLoading] = useState(false)
  const [email, setEmail]         = useState('')
  const [nom, setNom]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)

  async function verifySiret(value: string) {
    setSiretError('')
    setSiretData(null)
    if (value.replace(/\s/g, '').length !== 14) return
    setSiretLoading(true)
    try {
      const res = await fetch('/api/agences/verify-siret', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ siret: value.replace(/\s/g, '') }),
      })
      const data = await res.json()
      if (data.valid) {
        setSiretData({ nom: data.data.nom, ville: data.data.ville ?? '' })
        setNom(data.data.nom)
      } else if (data.reason === 'activite_non_immobiliere') {
        setSiretError("Cette entreprise n'a pas d'activité immobilière.")
      } else {
        setSiretError('SIRET introuvable.')
      }
    } catch {
      setSiretError('Impossible de vérifier le SIRET.')
    } finally {
      setSiretLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!siretData) return
    setSubmitting(true)
    try {
      await fetch('/api/agences/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          siret:         siret.replace(/\s/g, ''),
          nom,
          ville:         siretData.ville,
          contact_email: email,
        }),
      })
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-md bg-[var(--brikii-bg)] p-6 shadow-xl relative"
        style={{ borderRadius: 'var(--brikii-radius-card)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)]"
        >
          <X size={18} />
        </button>

        {done ? (
          <div className="text-center py-4">
            <p className="font-semibold text-[var(--brikii-text)] mb-2">Demande envoyée ✓</p>
            <p className="text-sm text-[var(--brikii-text-muted)]">
              Nous vous contacterons sous 24h pour valider votre agence.
            </p>
            <BrikiiButton className="mt-4" onClick={onClose}>Fermer</BrikiiButton>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-[var(--brikii-text)] mb-4">
              Demander l'ajout de mon agence
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <BrikiiInput
                  label="SIRET (14 chiffres)"
                  value={siret}
                  onChange={e => {
                    setSiret(e.target.value)
                    if (e.target.value.replace(/\s/g, '').length === 14) {
                      verifySiret(e.target.value)
                    }
                  }}
                  placeholder="362 521 879 00034"
                  maxLength={17}
                  icon={siretLoading ? <Loader2 size={14} className="animate-spin" /> : undefined}
                />
                {siretError && (
                  <p className="text-xs text-[var(--brikii-danger)] mt-1">{siretError}</p>
                )}
                {siretData && (
                  <p className="text-xs text-[var(--brikii-text-muted)] mt-1">
                    ✓ {siretData.nom} — {siretData.ville}
                  </p>
                )}
              </div>

              <BrikiiInput
                label="Nom de l'agence"
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Mon Agence Immobilière"
                required
              />

              <BrikiiInput
                label="Votre email de contact"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                required
              />

              <BrikiiButton
                type="submit"
                loading={submitting}
                disabled={!siretData || !email || !nom}
                className="w-full"
              >
                Envoyer la demande
              </BrikiiButton>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export function AgenceSearchInput({
  onSelect,
  defaultValue,
  placeholder = 'Rechercher votre agence ou réseau…',
  disabled,
}: AgenceSearchInputProps) {
  const [query, setQuery]           = useState(defaultValue?.nom ?? '')
  const [results, setResults]       = useState<Agence[]>([])
  const [loading, setLoading]       = useState(false)
  const [open, setOpen]             = useState(false)
  const [selected, setSelected]     = useState<Agence | null>(defaultValue ?? null)
  const [showModal, setShowModal]   = useState(false)
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef                = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/agences/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (selected) { setSelected(null); onSelect(null) }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(agence: Agence) {
    setSelected(agence)
    setQuery(agence.nom)
    setOpen(false)
    onSelect(agence)
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect(null)
  }

  // Fermer au clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brikii-text-muted)] pointer-events-none"
          />
          <input
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={[
              'w-full h-9 pl-8 pr-8 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)]',
              'placeholder:text-[var(--brikii-text-muted)] outline-none transition-colors',
              'border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
            style={{ borderRadius: 'var(--brikii-radius-input)' }}
          />
          {(loading) && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--brikii-text-muted)]"
            />
          )}
          {selected && !loading && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {open && (
          <div
            className="absolute z-40 w-full mt-1 bg-[var(--brikii-bg)] border border-[var(--brikii-border)] shadow-lg overflow-hidden"
            style={{ borderRadius: 'var(--brikii-radius-card)' }}
          >
            {results.length > 0 ? (
              <>
                {results.map((a, i) => (
                  <button
                    key={a.id ?? a.siret ?? i}
                    onClick={() => handleSelect(a)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--brikii-bg-subtle)] transition-colors"
                  >
                    {a.logo_url ? (
                      <img src={a.logo_url} alt="" className="w-6 h-6 object-contain rounded" />
                    ) : (
                      <Building2 size={16} className="shrink-0 text-[var(--brikii-text-muted)]" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--brikii-text)] truncate">{a.nom}</p>
                      {a.ville && (
                        <p className="text-xs text-[var(--brikii-text-muted)] truncate">{a.ville}</p>
                      )}
                    </div>
                  </button>
                ))}
                <div className="border-t border-[var(--brikii-border)]" />
              </>
            ) : (
              <p className="px-3 py-2.5 text-sm text-[var(--brikii-text-muted)]">
                Aucune agence trouvée
              </p>
            )}
            <button
              onClick={() => { setOpen(false); setShowModal(true) }}
              className="w-full px-3 py-2.5 text-left text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] hover:bg-[var(--brikii-bg-subtle)] transition-colors"
            >
              + Mon agence n'est pas dans la liste
            </button>
          </div>
        )}
      </div>

      {showModal && <DemandeModal onClose={() => setShowModal(false)} />}
    </>
  )
}
