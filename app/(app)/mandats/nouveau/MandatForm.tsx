'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { ImportMandatStatus } from './ImportMandatStatus'

type Tab = 'manuel' | 'import'

const MANDAT_TYPES = [
  { value: 'exclusif',     label: 'Exclusif' },
  { value: 'simple',       label: 'Simple' },
  { value: 'semi_exclusif', label: 'Semi-exclusif' },
  { value: 'recherche',    label: 'Recherche' },
  { value: 'gestion',      label: 'Gestion' },
]

const HONO_CHARGES = [
  { value: '',         label: '— Non renseigné —' },
  { value: 'vendeur',  label: 'Vendeur' },
  { value: 'acquereur', label: 'Acquéreur' },
  { value: 'partage',  label: 'Partagé' },
]

interface ImportState {
  importId:  string
  sourceUrl: string
  createdAt: number
}

interface MandatFormProps {
  bienId:    string | null
  bienLabel: string | null
}

export function MandatForm({ bienId, bienLabel }: MandatFormProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('manuel')

  // ── Champs saisie manuelle ────────────────────────────────────────────────
  const [type, setType]                       = useState('exclusif')
  const [dateSignature, setDateSignature]     = useState('')
  const [dateDebut, setDateDebut]             = useState('')
  const [dureeMois, setDureeMois]             = useState('')
  const [reconductible, setReconductible]     = useState(true)
  const [prixVente, setPrixVente]             = useState('')
  const [honorairesPct, setHonorairesPct]     = useState('')
  const [honorairesCharge, setHonorairesCharge] = useState('')
  const [manualLoading, setManualLoading]     = useState(false)
  const [manualError, setManualError]         = useState<string | null>(null)

  // ── Import PDF ────────────────────────────────────────────────────────────
  const [importUrl, setImportUrl]             = useState('')
  const [importLoading, setImportLoading]     = useState(false)
  const [importError, setImportError]         = useState<string | null>(null)
  const [importUnavailable, setImportUnavailable] = useState(false)
  const [importState, setImportState]         = useState<ImportState | null>(null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setManualError(null)

    if (!dateSignature || !dateDebut || !prixVente) {
      setManualError('Veuillez renseigner les champs obligatoires.')
      return
    }

    setManualLoading(true)
    try {
      const res = await fetch('/api/mandats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bien_id:           bienId ?? undefined,
          type,
          date_signature:    dateSignature,
          date_debut:        dateDebut,
          duree_mois:        dureeMois ? parseInt(dureeMois, 10) : undefined,
          reconductible,
          prix_vente:        parseFloat(prixVente),
          honoraires_pct:    honorairesPct ? parseFloat(honorairesPct) : undefined,
          honoraires_charge: honorairesCharge || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: unknown }
        setManualError(typeof data.error === 'string' ? data.error : 'Erreur lors de la création.')
        return
      }
      const result = await res.json() as { id: string }
      router.push(`/mandats/${result.id}`)
    } catch {
      setManualError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setManualLoading(false)
    }
  }

  async function handleImport(url: string) {
    setImportError(null)
    setImportUnavailable(false)
    setImportLoading(true)
    setImportState(null)
    try {
      const res = await fetch('/api/mandats/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: url }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: unknown }
        const msg = typeof data.error === 'string' ? data.error : ''
        // n8n non configuré → message dédié
        if (res.status === 502 && (msg.includes('non configuré') || msg.includes('n8n'))) {
          setImportUnavailable(true)
          return
        }
        setImportError(msg || "Impossible de lancer l'import.")
        return
      }
      const result = await res.json() as { import_id: string }
      setImportState({ importId: result.import_id, sourceUrl: url, createdAt: Date.now() })
    } catch {
      setImportError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setImportLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">
      {/* Tabs */}
      <div className="flex border-b border-[var(--brikii-border)] mb-6">
        {(['manuel', 'import'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-[var(--brikii-dark)] text-[var(--brikii-text)]'
                : 'border-transparent text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)]',
            ].join(' ')}
          >
            {t === 'manuel' ? 'Saisie manuelle' : 'Importer un document'}
          </button>
        ))}
      </div>

      {/* ─── Onglet Saisie manuelle ─── */}
      {tab === 'manuel' && (
        <form onSubmit={handleManualSubmit}>
          <BrikiiCard className="flex flex-col gap-5">
            {/* Bien associé */}
            {bienId ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--brikii-text)]">Bien associé</span>
                <span className="text-sm text-[var(--brikii-text)] bg-[var(--brikii-bg-subtle)] px-3 py-2 rounded-md">
                  {bienLabel ?? bienId}
                </span>
              </div>
            ) : (
              <p className="text-xs text-[var(--brikii-text-muted)]">
                Aucun bien sélectionné — vous pourrez associer le bien depuis la fiche du mandat.
              </p>
            )}

            {/* Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--brikii-text)]">
                Type de mandat <span className="text-[var(--brikii-danger)]">*</span>
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                required
                className="w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors"
                style={{ borderRadius: 'var(--brikii-radius-input)' }}
              >
                {MANDAT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <BrikiiInput
                label="Date de signature *"
                type="date"
                value={dateSignature}
                onChange={e => setDateSignature(e.target.value)}
                required
              />
              <BrikiiInput
                label="Date de début *"
                type="date"
                value={dateDebut}
                onChange={e => setDateDebut(e.target.value)}
                required
              />
            </div>

            {/* Durée */}
            <div className="grid grid-cols-2 gap-4">
              <BrikiiInput
                label="Durée (mois)"
                type="number"
                min="1"
                max="120"
                value={dureeMois}
                onChange={e => setDureeMois(e.target.value)}
                placeholder="12"
              />
              <div className="flex flex-col gap-1 justify-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reconductible}
                    onChange={e => setReconductible(e.target.checked)}
                    className="w-4 h-4 accent-[var(--brikii-yellow)]"
                  />
                  <span className="text-sm text-[var(--brikii-text)]">Reconductible</span>
                </label>
              </div>
            </div>

            {/* Prix */}
            <BrikiiInput
              label="Prix de vente (€) *"
              type="number"
              min="0"
              step="1000"
              value={prixVente}
              onChange={e => setPrixVente(e.target.value)}
              placeholder="350000"
              required
            />

            {/* Honoraires */}
            <div className="grid grid-cols-2 gap-4">
              <BrikiiInput
                label="Honoraires (%)"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={honorairesPct}
                onChange={e => setHonorairesPct(e.target.value)}
                placeholder="5"
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--brikii-text)]">Charge honoraires</label>
                <select
                  value={honorairesCharge}
                  onChange={e => setHonorairesCharge(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors"
                  style={{ borderRadius: 'var(--brikii-radius-input)' }}
                >
                  {HONO_CHARGES.map(h => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {manualError && (
              <p className="text-xs text-[var(--brikii-danger)]">{manualError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <BrikiiButton variant="ghost" type="button" onClick={() => router.back()}>
                Annuler
              </BrikiiButton>
              <BrikiiButton type="submit" loading={manualLoading}>
                Associer le mandat
              </BrikiiButton>
            </div>
          </BrikiiCard>
        </form>
      )}

      {/* ─── Onglet Import document ─── */}
      {tab === 'import' && (
        <BrikiiCard className="flex flex-col gap-5">
          <div>
            <p className="text-sm text-[var(--brikii-text)]">
              Collez l&apos;URL du document PDF ou de l&apos;annonce à importer.
            </p>
            <p className="text-xs text-[var(--brikii-text-muted)] mt-1">
              Le workflow d&apos;extraction créera automatiquement le mandat avec les informations détectées.
            </p>
          </div>

          {importUnavailable ? (
            <div className="flex flex-col gap-3 px-4 py-3 bg-[var(--brikii-warning-bg)] rounded-lg">
              <p className="text-sm text-[var(--brikii-warning)]">
                L&apos;import intelligent de documents n&apos;est pas encore disponible.
              </p>
              <p className="text-xs text-[var(--brikii-text-muted)]">
                Le workflow d&apos;extraction automatique n&apos;est pas encore configuré.
                Vous pouvez saisir les informations manuellement.
              </p>
              <BrikiiButton variant="ghost" size="sm" onClick={() => setTab('manuel')}>
                Saisir manuellement
              </BrikiiButton>
            </div>
          ) : !importState ? (
            <>
              <BrikiiInput
                label="URL du document"
                type="url"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://…"
              />
              {importError && (
                <p className="text-xs text-[var(--brikii-danger)]">{importError}</p>
              )}
              <div className="flex justify-end gap-2">
                <BrikiiButton variant="ghost" type="button" onClick={() => setTab('manuel')}>
                  Saisir manuellement
                </BrikiiButton>
                <BrikiiButton
                  loading={importLoading}
                  disabled={!importUrl.trim()}
                  onClick={() => handleImport(importUrl.trim())}
                >
                  Lancer l&apos;import
                </BrikiiButton>
              </div>
            </>
          ) : (
            <ImportMandatStatus
              importId={importState.importId}
              sourceUrl={importState.sourceUrl}
              createdAt={importState.createdAt}
              onRetry={url => handleImport(url)}
              onManual={() => setTab('manuel')}
            />
          )}
        </BrikiiCard>
      )}
    </div>
  )
}
