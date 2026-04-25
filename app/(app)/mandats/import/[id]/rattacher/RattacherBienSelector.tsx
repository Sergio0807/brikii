'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiCard } from '@/components/shared/BrikiiCard'

const TYPE_LABELS: Record<string, string> = {
  maison:      'Maison',
  appartement: 'Appartement',
  terrain:     'Terrain',
  immeuble:    'Immeuble',
  commerce:    'Commerce',
  local:       'Local',
  autre:       'Autre',
}

type Bien = {
  id: string
  reference: string
  type: string
  adresse: string | null
  ville: string
  code_postal: string
}

interface Props {
  importId:  string
  fileName:  string
  biens:     Bien[]
}

export function RattacherBienSelector({ importId, fileName, biens }: Props) {
  const router = useRouter()
  const [query, setQuery]         = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const filtered = biens.filter(b => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      b.ville.toLowerCase().includes(q) ||
      b.code_postal.includes(q) ||
      b.reference.toLowerCase().includes(q) ||
      (b.adresse ?? '').toLowerCase().includes(q)
    )
  })

  async function handleChoisir(bienId: string) {
    setLoadingId(bienId)
    setError(null)
    try {
      const res = await fetch(`/api/mandats/import/${importId}/rattacher`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bien_id: bienId }),
      })
      const data = await res.json() as { mandat_id?: string; error?: string }
      if (!res.ok || !data.mandat_id) {
        setError(data.error ?? 'Erreur lors du rattachement.')
        return
      }
      router.push(`/mandats/${data.mandat_id}`)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* Contexte import */}
      <div
        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--brikii-text-muted)]"
        style={{ background: 'var(--brikii-bg-subtle)', borderRadius: 'var(--brikii-radius-input)' }}
      >
        <span>📄</span>
        <span className="truncate">{fileName}</span>
      </div>

      {/* Recherche */}
      <BrikiiInput
        label="Rechercher un bien"
        placeholder="Ville, code postal, référence…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--brikii-text-muted)]">Aucun bien correspondant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(b => (
            <BrikiiCard key={b.id} padding="sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-medium text-[var(--brikii-text)]">
                    {TYPE_LABELS[b.type] ?? b.type} — {b.ville} ({b.code_postal})
                  </p>
                  {b.adresse && (
                    <p className="text-xs text-[var(--brikii-text-muted)] truncate">{b.adresse}</p>
                  )}
                  <p className="text-xs font-mono text-[var(--brikii-text-muted)]">{b.reference}</p>
                </div>
                <BrikiiButton
                  size="sm"
                  loading={loadingId === b.id}
                  disabled={!!loadingId}
                  onClick={() => handleChoisir(b.id)}
                >
                  Choisir
                </BrikiiButton>
              </div>
            </BrikiiCard>
          ))}
        </div>
      )}
    </div>
  )
}
