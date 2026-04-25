'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiButton } from '@/components/shared/BrikiiButton'

interface Bien {
  id: string
  reference: string | null
  type: string | null
  adresse: string | null
  ville: string | null
  code_postal: string | null
}

interface Props {
  mandatId: string
  biens: Bien[]
  currentBienId: string | null
}

const BIEN_TYPE_LABELS: Record<string, string> = {
  maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain',
  immeuble: 'Immeuble', commerce: 'Commerce', local: 'Local', autre: 'Autre',
}

export function RattacherMandatBienSelector({ mandatId, biens, currentBienId }: Props) {
  const router = useRouter()
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return biens
    return biens.filter(b =>
      b.ville?.toLowerCase().includes(q) ||
      b.code_postal?.includes(q) ||
      b.adresse?.toLowerCase().includes(q) ||
      b.reference?.toLowerCase().includes(q)
    )
  }, [biens, search])

  async function handleSelect(bienId: string) {
    setError(null)
    setLoading(bienId)
    try {
      const res = await fetch(`/api/mandats/${mandatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bien_id: bienId }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur lors du rattachement.')
        return
      }
      router.push(`/mandats/${mandatId}`)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BrikiiInput
        placeholder="Filtrer par ville, adresse, référence…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--brikii-text-muted)] text-center py-8">
          Aucun bien ne correspond à cette recherche.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(bien => {
            const label = bien.reference ?? (bien.type ? BIEN_TYPE_LABELS[bien.type] ?? bien.type : '—')
            const location = [bien.ville, bien.code_postal && `(${bien.code_postal})`].filter(Boolean).join(' ')
            const isCurrent = bien.id === currentBienId

            return (
              <div
                key={bien.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
                style={{
                  border: `1px solid ${isCurrent ? 'var(--brikii-dark)' : 'var(--brikii-border)'}`,
                  borderRadius: 'var(--brikii-radius-card)',
                  background: isCurrent ? 'var(--brikii-bg-subtle)' : 'var(--brikii-bg)',
                }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-[var(--brikii-text)] truncate">{label}</span>
                  {location && <span className="text-xs text-[var(--brikii-text-muted)]">{location}</span>}
                  {bien.adresse && (
                    <span className="text-xs text-[var(--brikii-text-muted)] truncate">{bien.adresse}</span>
                  )}
                </div>
                <BrikiiButton
                  variant={isCurrent ? 'ghost' : 'secondary'}
                  size="sm"
                  loading={loading === bien.id}
                  disabled={isCurrent || !!loading}
                  onClick={() => handleSelect(bien.id)}
                >
                  {isCurrent ? 'Actuel' : 'Choisir'}
                </BrikiiButton>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
