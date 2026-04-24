'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { ImportMandatStatus } from './ImportMandatStatus'

type Tab = 'manuel' | 'import'

const MANDAT_TYPES = [
  { value: 'exclusif',      label: 'Exclusif' },
  { value: 'simple',        label: 'Simple' },
  { value: 'semi_exclusif', label: 'Semi-exclusif' },
  { value: 'recherche',     label: 'Recherche' },
  { value: 'gestion',       label: 'Gestion' },
]

const HONO_CHARGES = [
  { value: '',          label: '— Non renseigné —' },
  { value: 'vendeur',   label: 'Vendeur' },
  { value: 'acquereur', label: 'Acquéreur' },
  { value: 'partage',   label: 'Partagé' },
]

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
const ACCEPTED_EXT   = '.pdf,.jpg,.jpeg,.png,.heic,.heif'
const MAX_SIZE_MB    = 20

interface ImportState {
  importId:     string
  fileName:     string
  createdAt:    number
  n8nAvailable: boolean
}

interface MandatFormProps {
  bienId:    string | null
  bienLabel: string | null
}

export function MandatForm({ bienId, bienLabel }: MandatFormProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('manuel')

  // ── Champs saisie manuelle ────────────────────────────────────────────────
  const [type, setType]                         = useState('exclusif')
  const [dateSignature, setDateSignature]       = useState('')
  const [dateDebut, setDateDebut]               = useState('')
  const [dureeMois, setDureeMois]               = useState('')
  const [reconductible, setReconductible]       = useState(true)
  const [prixVente, setPrixVente]               = useState('')
  const [honorairesPct, setHonorairesPct]       = useState('')
  const [honorairesCharge, setHonorairesCharge] = useState('')
  const [manualLoading, setManualLoading]       = useState(false)
  const [manualError, setManualError]           = useState<string | null>(null)

  // ── Import fichier ────────────────────────────────────────────────────────
  const fileInputRef                      = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [fileError, setFileError]         = useState<string | null>(null)
  const [dragging, setDragging]           = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError]     = useState<string | null>(null)
  const [importState, setImportState]     = useState<ImportState | null>(null)

  // ── File helpers ──────────────────────────────────────────────────────────

  const validateAndSetFile = useCallback((f: File) => {
    const isHeic = /\.heic?$/i.test(f.name) || /\.heif$/i.test(f.name)
    if (!ACCEPTED_TYPES.includes(f.type) && !isHeic) {
      setFileError('Format non supporté. Utilisez PDF, JPG, PNG ou HEIC.')
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`Fichier trop volumineux (max ${MAX_SIZE_MB} Mo).`)
      return
    }
    setSelectedFile(f)
    setFileError(null)
    setImportError(null)
    setImportState(null)
  }, [])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) validateAndSetFile(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) validateAndSetFile(f)
  }

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

  async function handleImportFile(file: File) {
    setImportError(null)
    setImportLoading(true)
    setImportState(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/mandats/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error?: unknown }
        setImportError(typeof data.error === 'string' ? data.error : "Impossible d'uploader le fichier.")
        return
      }

      const result = await res.json() as { import_id: string; n8n_available: boolean }
      setImportState({
        importId:     result.import_id,
        fileName:     file.name,
        createdAt:    Date.now(),
        n8nAvailable: result.n8n_available,
      })
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
                <span
                  className="text-sm text-[var(--brikii-text)] px-3 py-2"
                  style={{ background: 'var(--brikii-bg-subtle)', borderRadius: 'var(--brikii-radius-input)' }}
                >
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

            {/* Durée + Reconductible */}
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
            <p className="text-sm font-medium text-[var(--brikii-text)]">
              Déposez votre mandat au format PDF ou image
            </p>
            <p className="text-xs text-[var(--brikii-text-muted)] mt-1">
              Le document sera analysé automatiquement pour préremplir la fiche mandat.
              Formats acceptés : PDF, JPG, PNG, HEIC — max {MAX_SIZE_MB} Mo.
            </p>
          </div>

          {importState && !importState.n8nAvailable ? (
            /* Fichier uploadé mais analyse non disponible */
            <div
              className="flex flex-col gap-3 px-4 py-3"
              style={{ background: 'var(--brikii-bg-subtle)', border: '1px solid var(--brikii-border)', borderRadius: 'var(--brikii-radius-card)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">✅</span>
                <p className="text-sm font-medium text-[var(--brikii-text)]">
                  Fichier déposé avec succès
                </p>
              </div>
              <p className="text-xs text-[var(--brikii-text-muted)]">{importState.fileName}</p>
              <div
                className="px-3 py-2"
                style={{ background: 'var(--brikii-warning-bg)', borderRadius: 'var(--brikii-radius-input)' }}
              >
                <p className="text-xs text-[var(--brikii-warning)]">
                  L&apos;analyse automatique n&apos;est pas encore disponible.
                  Votre fichier est conservé et pourra être traité ultérieurement.
                </p>
              </div>
              <BrikiiButton variant="ghost" size="sm" onClick={() => setTab('manuel')}>
                Continuer en saisie manuelle
              </BrikiiButton>
            </div>
          ) : importState ? (
            /* Fichier uploadé + n8n déclenché → polling */
            <ImportMandatStatus
              importId={importState.importId}
              fileName={importState.fileName}
              createdAt={importState.createdAt}
              onRetry={() => selectedFile && handleImportFile(selectedFile)}
              onManual={() => setTab('manuel')}
            />
          ) : (
            <>
              {/* Zone de dépôt */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT}
                onChange={handleFileInput}
                className="sr-only"
                aria-label="Choisir un fichier"
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={[
                  'flex flex-col items-center justify-center gap-3 px-6 py-10 border-2 border-dashed cursor-pointer transition-colors select-none',
                  dragging
                    ? 'border-[var(--brikii-dark)] bg-[var(--brikii-bg-subtle)]'
                    : selectedFile
                      ? 'border-[var(--brikii-dark)] bg-[var(--brikii-bg-subtle)]'
                      : 'border-[var(--brikii-border)] hover:border-[var(--brikii-dark)] hover:bg-[var(--brikii-bg-subtle)]',
                ].join(' ')}
                style={{ borderRadius: 'var(--brikii-radius-card)' }}
              >
                {selectedFile ? (
                  <>
                    <span className="text-2xl">📄</span>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[var(--brikii-text)] break-all">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-[var(--brikii-text-muted)] mt-0.5">
                        {(selectedFile.size / 1024 / 1024).toFixed(1)} Mo · Cliquez pour changer
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-2xl opacity-40">📂</span>
                    <div className="text-center">
                      <p className="text-sm text-[var(--brikii-text-muted)]">
                        Déposez votre fichier ici ou{' '}
                        <span className="text-[var(--brikii-dark)] underline underline-offset-2">
                          cliquez pour parcourir
                        </span>
                      </p>
                      <p className="text-xs text-[var(--brikii-text-muted)] mt-0.5">
                        PDF, JPG, PNG, HEIC — max {MAX_SIZE_MB} Mo
                      </p>
                    </div>
                  </>
                )}
              </div>

              {fileError && (
                <p className="text-xs text-[var(--brikii-danger)]">{fileError}</p>
              )}
              {importError && (
                <p className="text-xs text-[var(--brikii-danger)]">{importError}</p>
              )}

              <div className="flex justify-end gap-2">
                <BrikiiButton variant="ghost" type="button" onClick={() => setTab('manuel')}>
                  Saisir manuellement
                </BrikiiButton>
                <BrikiiButton
                  loading={importLoading}
                  disabled={!selectedFile || !!fileError}
                  onClick={() => selectedFile && handleImportFile(selectedFile)}
                >
                  Importer le document
                </BrikiiButton>
              </div>
            </>
          )}
        </BrikiiCard>
      )}
    </div>
  )
}
