'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, User, Building2 } from 'lucide-react'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  personne_type: string
  civilite?: string | null
  prenom?: string | null
  nom?: string | null
  raison_sociale?: string | null
  email?: string | null
  telephone?: string | null
  ville?: string | null
  types?: string[] | null
  statut: string
  score?: string | null
  created_at: string
}

// ── Référentiel catégories ────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'tous',        label: 'Tous' },
  { id: 'particulier', label: 'Particuliers' },
  { id: 'pro_immo',   label: 'Pro immobilier' },
  { id: 'pro_tech',   label: 'Pro technique' },
  { id: 'juridique',  label: 'Juridique' },
  { id: 'autre',      label: 'Autre' },
] as const

const TYPE_CATEGORIE: Record<string, string> = {
  proprietaire_vendeur: 'particulier',
  proprietaire_bailleur: 'particulier',
  locataire: 'particulier',
  acquereur: 'particulier',
  prospect_acquereur: 'particulier',
  prospect_vendeur: 'particulier',
  agent_immobilier: 'pro_immo',
  mandataire: 'pro_immo',
  negociateur: 'pro_immo',
  notaire: 'pro_immo',
  gestionnaire: 'pro_immo',
  diagnostiqueur: 'pro_tech',
  geometre: 'pro_tech',
  architecte: 'pro_tech',
  artisan_maconnerie: 'pro_tech',
  artisan_electricite: 'pro_tech',
  artisan_plomberie: 'pro_tech',
  artisan_autre: 'pro_tech',
  expert_immobilier: 'pro_tech',
  avocat: 'juridique',
  huissier: 'juridique',
  banquier: 'juridique',
  courtier_credit: 'juridique',
  assureur: 'juridique',
  comptable: 'juridique',
  autre: 'autre',
}

const TYPE_LABELS: Record<string, string> = {
  proprietaire_vendeur: 'Propriétaire vendeur',
  proprietaire_bailleur: 'Propriétaire bailleur',
  locataire: 'Locataire',
  acquereur: 'Acquéreur',
  prospect_acquereur: 'Prospect acquéreur',
  prospect_vendeur: 'Prospect vendeur',
  agent_immobilier: 'Agent immobilier',
  mandataire: 'Mandataire',
  negociateur: 'Négociateur',
  notaire: 'Notaire',
  gestionnaire: 'Gestionnaire',
  diagnostiqueur: 'Diagnostiqueur',
  geometre: 'Géomètre',
  architecte: 'Architecte',
  artisan_maconnerie: 'Artisan maçonnerie',
  artisan_electricite: 'Artisan électricité',
  artisan_plomberie: 'Artisan plomberie',
  artisan_autre: 'Artisan autre',
  expert_immobilier: 'Expert immobilier',
  avocat: 'Avocat',
  huissier: 'Huissier',
  banquier: 'Banquier',
  courtier_credit: 'Courtier crédit',
  assureur: 'Assureur',
  comptable: 'Comptable',
  autre: 'Autre',
}

const SCORE_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  A: { label: 'A', variant: 'success' },
  B: { label: 'B', variant: 'info' },
  C: { label: 'C', variant: 'warning' },
  D: { label: 'D', variant: 'neutral' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function contactDisplayName(c: Contact): string {
  if (c.personne_type === 'morale') return c.raison_sociale ?? '—'
  return [c.prenom, c.nom].filter(Boolean).join(' ') || c.email || '—'
}

function contactSubline(c: Contact): string {
  const parts: string[] = []
  if (c.telephone) parts.push(c.telephone)
  if (c.email) parts.push(c.email)
  if (c.ville) parts.push(c.ville)
  return parts.join(' · ') || '—'
}

function matchesSearch(c: Contact, q: string): boolean {
  if (!q) return true
  const lower = q.toLowerCase()
  return (
    (c.prenom ?? '').toLowerCase().includes(lower) ||
    (c.nom ?? '').toLowerCase().includes(lower) ||
    (c.raison_sociale ?? '').toLowerCase().includes(lower) ||
    (c.email ?? '').toLowerCase().includes(lower) ||
    (c.telephone ?? '').toLowerCase().includes(lower) ||
    (c.ville ?? '').toLowerCase().includes(lower)
  )
}

function contactBelongsToCategory(c: Contact, cat: string): boolean {
  if (cat === 'tous') return true
  const types = c.types ?? []
  return types.some(t => TYPE_CATEGORIE[t] === cat)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContactsList({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('tous')

  const filtered = useMemo(() => {
    return contacts.filter(c =>
      matchesSearch(c, query) && contactBelongsToCategory(c, category)
    )
  }, [contacts, query, category])

  const counts = useMemo(() => {
    const result: Record<string, number> = { tous: contacts.length }
    for (const cat of CATEGORIES.slice(1)) {
      result[cat.id] = contacts.filter(c => contactBelongsToCategory(c, cat.id)).length
    }
    return result
  }, [contacts])

  return (
    <div className="flex flex-col gap-4">

      {/* Barre recherche */}
      <div
        className="px-4 py-3 flex flex-col gap-3"
        style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brikii-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone, ville…"
            className="w-full h-9 pl-9 pr-3 text-sm bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text)] placeholder:text-[var(--brikii-text-muted)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors"
            style={{ borderRadius: 'var(--brikii-radius-input)' }}
          />
        </div>

        {/* Filtres catégorie */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={[
                'px-3 py-1 text-xs font-medium transition-colors',
                category === cat.id
                  ? 'bg-[var(--brikii-dark)] text-white'
                  : 'bg-[var(--brikii-bg-subtle)] text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)]',
              ].join(' ')}
              style={{ borderRadius: 'var(--brikii-radius-btn)' }}
            >
              {cat.label}
              {counts[cat.id] > 0 && (
                <span className="ml-1.5 opacity-60">{counts[cat.id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Compteur résultats */}
      <p className="text-xs text-[var(--brikii-text-muted)] px-1">
        {filtered.length === 0
          ? 'Aucun contact'
          : `${filtered.length} contact${filtered.length > 1 ? 's' : ''}`}
        {query && ` pour « ${query} »`}
      </p>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div
          className="px-5 py-10 flex flex-col items-center gap-2 text-center"
          style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
        >
          <p className="text-sm text-[var(--brikii-text-muted)]">
            {query || category !== 'tous'
              ? 'Aucun contact ne correspond à cette recherche.'
              : 'Aucun contact enregistré. Commencez par en créer un.'}
          </p>
        </div>
      ) : (
        <div
          style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
          className="divide-y divide-[var(--brikii-border)]"
        >
          {filtered.map(c => {
            const types = c.types ?? []
            const score = c.score ? SCORE_CONFIG[c.score] : null

            return (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--brikii-bg-subtle)] transition-colors group"
              >
                {/* Avatar icône */}
                <div
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'var(--brikii-bg-subtle)', borderRadius: 'var(--brikii-radius-input)' }}
                >
                  {c.personne_type === 'morale'
                    ? <Building2 className="w-4 h-4 text-[var(--brikii-text-muted)]" />
                    : <User className="w-4 h-4 text-[var(--brikii-text-muted)]" />
                  }
                </div>

                {/* Info principale */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--brikii-text)] group-hover:text-[var(--brikii-dark)] transition-colors truncate">
                      {contactDisplayName(c)}
                    </span>
                    {c.statut === 'inactif' && <BrikiiBadge variant="neutral">Inactif</BrikiiBadge>}
                    {c.statut === 'archive' && <BrikiiBadge variant="neutral">Archivé</BrikiiBadge>}
                    {score && <BrikiiBadge variant={score.variant}>{score.label}</BrikiiBadge>}
                  </div>
                  <p className="text-xs text-[var(--brikii-text-muted)] truncate mt-0.5">
                    {contactSubline(c)}
                  </p>
                </div>

                {/* Types — colonne droite */}
                {types.length > 0 && (
                  <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0 max-w-[160px]">
                    {types.slice(0, 2).map(t => (
                      <span key={t} className="text-xs text-[var(--brikii-text-muted)] truncate">
                        {TYPE_LABELS[t] ?? t}
                      </span>
                    ))}
                    {types.length > 2 && (
                      <span className="text-xs text-[var(--brikii-text-muted)] opacity-60">
                        +{types.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
