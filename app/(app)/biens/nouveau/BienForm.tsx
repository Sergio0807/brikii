'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { AdresseAutocomplete } from '@/components/shared/AdresseAutocomplete'
import { ImportStatus } from './ImportStatus'

type Tab = 'manuel' | 'import'

const TYPES = [
  { value: 'maison', label: 'Maison' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'immeuble', label: 'Immeuble' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'local', label: 'Local' },
  { value: 'autre', label: 'Autre' },
]

interface ImportState {
  importId: string
  sourceUrl: string
  createdAt: number
}

export function BienForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('manuel')

  // Manual form state
  const [type, setType] = useState('maison')
  const [adresse, setAdresse] = useState('')
  const [ville, setVille] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [prix, setPrix] = useState('')
  const [surfaceHab, setSurfaceHab] = useState('')
  const [descriptif, setDescriptif] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  // Import state
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importState, setImportState] = useState<ImportState | null>(null)

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setManualError(null)
    setManualLoading(true)
    try {
      const res = await fetch('/api/biens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          adresse,
          ville,
          code_postal: codePostal,
          prix: parseInt(prix, 10),
          surface_hab: surfaceHab ? parseFloat(surfaceHab) : undefined,
          descriptif: descriptif || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: unknown }
        setManualError(typeof data.error === 'string' ? data.error : 'Erreur lors de la création.')
        return
      }
      router.push('/biens')
    } catch {
      setManualError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setManualLoading(false)
    }
  }

  async function triggerImport(url: string) {
    setImportError(null)
    setImportLoading(true)
    setImportState(null)
    try {
      const res = await fetch('/api/biens/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: url }),
      })
      const data = await res.json() as { import_id?: string; error?: unknown }
      if (!res.ok || !data.import_id) {
        setImportError(typeof data.error === 'string' ? data.error : 'Impossible de lancer l\'import.')
        return
      }
      setImportState({ importId: data.import_id, sourceUrl: url, createdAt: Date.now() })
    } catch {
      setImportError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault()
    await triggerImport(importUrl)
  }

  return (
    <BrikiiCard>
      {/* Tabs */}
      <div className="flex gap-0 border-b border-[var(--brikii-border)] mb-6 -mx-5 -mt-5 px-5">
        {(['manuel', 'import'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t
                ? 'border-[var(--brikii-dark)] text-[var(--brikii-text)]'
                : 'border-transparent text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)]',
            ].join(' ')}
          >
            {t === 'manuel' ? 'Saisie manuelle' : 'Importer une annonce'}
          </button>
        ))}
      </div>

      {tab === 'manuel' && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--brikii-text)]">
              Type <span className="text-[var(--brikii-danger)]">*</span>
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              required
              className="w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors"
              style={{ borderRadius: 'var(--brikii-radius-input)' }}
            >
              {TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <AdresseAutocomplete
            label="Adresse"
            required
            value={adresse}
            onChange={setAdresse}
            onSelect={s => {
              setAdresse(s.name)
              setVille(s.city)
              setCodePostal(s.postcode)
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <BrikiiInput
              label="Ville"
              required
              value={ville}
              onChange={e => setVille(e.target.value)}
              placeholder="Albi"
            />
            <BrikiiInput
              label="Code postal"
              required
              value={codePostal}
              onChange={e => setCodePostal(e.target.value)}
              placeholder="81000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BrikiiInput
              label="Prix (€)"
              required
              type="number"
              min="0"
              value={prix}
              onChange={e => setPrix(e.target.value)}
              placeholder="350000"
            />
            <BrikiiInput
              label="Surface habitable (m²)"
              type="number"
              min="0"
              step="0.01"
              value={surfaceHab}
              onChange={e => setSurfaceHab(e.target.value)}
              placeholder="120"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--brikii-text)]">Descriptif</label>
            <textarea
              value={descriptif}
              onChange={e => setDescriptif(e.target.value)}
              rows={4}
              placeholder="Description du bien…"
              className="w-full px-3 py-2 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors resize-none placeholder:text-[var(--brikii-text-muted)]"
              style={{ borderRadius: 'var(--brikii-radius-input)' }}
            />
          </div>

          {manualError && (
            <p className="text-xs text-[var(--brikii-danger)]">{manualError}</p>
          )}

          <div className="flex justify-end gap-2">
            <BrikiiButton variant="ghost" type="button" onClick={() => router.push('/biens')}>
              Annuler
            </BrikiiButton>
            <BrikiiButton type="submit" loading={manualLoading}>
              Créer le bien
            </BrikiiButton>
          </div>
        </form>
      )}

      {tab === 'import' && (
        <div className="flex flex-col gap-4">
          {!importState ? (
            <form onSubmit={handleImportSubmit} className="flex flex-col gap-4">
              <BrikiiInput
                label="URL de l'annonce"
                required
                type="url"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://www.seloger.com/annonces/..."
                hint="SeLoger, LeBonCoin, Logic-Immo, etc."
              />
              {importError && (
                <p className="text-xs text-[var(--brikii-danger)]">{importError}</p>
              )}
              <div className="flex justify-end">
                <BrikiiButton type="submit" loading={importLoading}>
                  Importer
                </BrikiiButton>
              </div>
            </form>
          ) : (
            <ImportStatus
              importId={importState.importId}
              sourceUrl={importState.sourceUrl}
              createdAt={importState.createdAt}
              onRetry={(url) => triggerImport(url)}
              onManual={() => setTab('manuel')}
            />
          )}
        </div>
      )}
    </BrikiiCard>
  )
}
