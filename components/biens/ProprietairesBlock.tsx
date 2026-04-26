'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { ContactPicker, type ContactResult } from '@/components/shared/ContactPicker'

const NATURE_DROIT_LABELS: Record<string, string> = {
  pleine_propriete: 'Pleine propriété',
  usufruit: 'Usufruit',
  nue_propriete: 'Nue-propriété',
  indivision: 'Indivision',
}
const NATURE_DROIT_OPTIONS = Object.entries(NATURE_DROIT_LABELS).map(([value, label]) => ({ value, label }))

interface Contact {
  id: string
  personne_type: string
  civilite?: string | null
  prenom?: string | null
  nom?: string | null
  raison_sociale?: string | null
  email?: string | null
  telephone?: string | null
}

interface Proprietaire {
  id: string
  nature_droit: string
  quote_part_numerateur?: number | null
  quote_part_denominateur?: number | null
  date_entree?: string | null
  ordre: number
  contact: Contact | null
  representant: Contact | null
}

function contactLabel(c: Contact | null) {
  if (!c) return '—'
  if (c.personne_type === 'morale') return c.raison_sociale ?? '—'
  return [c.prenom, c.nom].filter(Boolean).join(' ') || c.email || '—'
}

interface ProprietairesBlockProps {
  bienId: string
  initialProprietaires: Proprietaire[]
}

export function ProprietairesBlock({ bienId, initialProprietaires }: ProprietairesBlockProps) {
  const router = useRouter()
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>(initialProprietaires)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Add form state
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null)
  const [natureDroit, setNatureDroit] = useState('pleine_propriete')
  const [qpNum, setQpNum] = useState('')
  const [qpDen, setQpDen] = useState('')
  const [dateEntree, setDateEntree] = useState('')

  function resetForm() {
    setSelectedContact(null)
    setNatureDroit('pleine_propriete')
    setQpNum('')
    setQpDen('')
    setDateEntree('')
    setError(null)
  }

  async function handleAdd() {
    if (!selectedContact) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        contact_id: selectedContact.id,
        nature_droit: natureDroit,
        ordre: proprietaires.length,
      }
      if (qpNum && qpDen) {
        body.quote_part_numerateur = parseInt(qpNum, 10)
        body.quote_part_denominateur = parseInt(qpDen, 10)
      }
      if (dateEntree) body.date_entree = dateEntree

      const res = await fetch(`/api/biens/${bienId}/proprietaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as Proprietaire & { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de l\'ajout')
        return
      }
      setProprietaires(prev => [...prev, data])
      setAdding(false)
      resetForm()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(propId: string) {
    if (!confirm('Supprimer ce propriétaire ?')) return
    const res = await fetch(`/api/biens/${bienId}/proprietaires/${propId}`, { method: 'DELETE' })
    if (res.ok) {
      setProprietaires(prev => prev.filter(p => p.id !== propId))
      router.refresh()
    }
  }

  return (
    <div
      className="p-5 flex flex-col gap-3"
      style={{ background: 'var(--brikii-bg)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
    >
      <div className="flex items-center justify-between border-b border-[var(--brikii-border)] pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brikii-text-muted)]">
          Propriétaires
        </h3>
        {!adding && (
          <BrikiiButton variant="ghost" size="sm" onClick={() => setAdding(true)}>
            + Ajouter
          </BrikiiButton>
        )}
      </div>

      {proprietaires.length === 0 && !adding && (
        <p className="text-sm text-[var(--brikii-text-muted)]">Aucun propriétaire enregistré.</p>
      )}

      {proprietaires.map(p => (
        <div key={p.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--brikii-text)] truncate">{contactLabel(p.contact)}</p>
              <p className="text-xs text-[var(--brikii-text-muted)]">
                {NATURE_DROIT_LABELS[p.nature_droit] ?? p.nature_droit}
                {p.quote_part_numerateur && p.quote_part_denominateur
                  ? ` — ${p.quote_part_numerateur}/${p.quote_part_denominateur}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="p-1 text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors"
              >
                {expandedId === p.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="p-1 text-[var(--brikii-text-muted)] hover:text-[var(--brikii-danger)] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {expandedId === p.id && (
            <div className="pl-2 border-l border-[var(--brikii-border)] flex flex-col gap-0.5 mt-1">
              {p.contact?.email && (
                <p className="text-xs text-[var(--brikii-text-muted)]">{p.contact.email}</p>
              )}
              {p.contact?.telephone && (
                <p className="text-xs text-[var(--brikii-text-muted)]">{p.contact.telephone}</p>
              )}
              {p.representant && (
                <p className="text-xs text-[var(--brikii-text-muted)]">
                  Représentant : {contactLabel(p.representant)}
                </p>
              )}
              {p.date_entree && (
                <p className="text-xs text-[var(--brikii-text-muted)]">
                  Entrée : {new Intl.DateTimeFormat('fr-FR').format(new Date(p.date_entree))}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {adding && (
        <div className="flex flex-col gap-3 pt-2 border-t border-[var(--brikii-border)]">
          <ContactPicker
            onSelect={setSelectedContact}
            placeholder="Rechercher ou créer un contact…"
            disabled={saving}
          />
          {selectedContact && (
            <div className="flex items-center justify-between px-3 py-1.5 text-sm bg-[var(--brikii-bg-subtle)] rounded" style={{ borderRadius: 'var(--brikii-radius-input)' }}>
              <span className="text-[var(--brikii-text)] font-medium">
                {contactLabel(selectedContact as Contact)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="text-[var(--brikii-text-muted)] hover:text-[var(--brikii-danger)] text-xs"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--brikii-text)]">Nature du droit</label>
            <select
              value={natureDroit}
              onChange={e => setNatureDroit(e.target.value)}
              disabled={saving}
              className="h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
              style={{ borderRadius: 'var(--brikii-radius-input)' }}
            >
              {NATURE_DROIT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-[var(--brikii-text)]">Quote-part num.</label>
              <input
                type="number"
                min="1"
                value={qpNum}
                onChange={e => setQpNum(e.target.value)}
                placeholder="ex. 1"
                disabled={saving}
                className="h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
                style={{ borderRadius: 'var(--brikii-radius-input)' }}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-[var(--brikii-text)]">Quote-part dén.</label>
              <input
                type="number"
                min="1"
                value={qpDen}
                onChange={e => setQpDen(e.target.value)}
                placeholder="ex. 2"
                disabled={saving}
                className="h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
                style={{ borderRadius: 'var(--brikii-radius-input)' }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--brikii-text)]">Date d&apos;entrée</label>
            <input
              type="date"
              value={dateEntree}
              onChange={e => setDateEntree(e.target.value)}
              disabled={saving}
              className="h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none"
              style={{ borderRadius: 'var(--brikii-radius-input)' }}
            />
          </div>
          {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}
          <div className="flex gap-2">
            <BrikiiButton size="sm" loading={saving} onClick={handleAdd} disabled={!selectedContact}>
              Enregistrer
            </BrikiiButton>
            <BrikiiButton variant="ghost" size="sm" onClick={() => { setAdding(false); resetForm() }}>
              Annuler
            </BrikiiButton>
          </div>
        </div>
      )}
    </div>
  )
}
