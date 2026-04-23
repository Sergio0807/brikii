import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { Building2 } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  maison: 'Maison',
  appartement: 'Appartement',
  terrain: 'Terrain',
  immeuble: 'Immeuble',
  commerce: 'Commerce',
  local: 'Local',
  autre: 'Autre',
}

const STATUT_LABELS: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  brouillon: { label: 'Brouillon', variant: 'neutral' },
  sur_le_marche: { label: 'Sur le marché', variant: 'success' },
  sous_offre: { label: 'Sous offre', variant: 'warning' },
  vendu: { label: 'Vendu', variant: 'info' },
  archive: { label: 'Archivé', variant: 'neutral' },
}

function formatPrix(prix: number | null): string {
  if (!prix) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix)
}

export default async function BiensPage() {
  const supabase = await createClient()
  const { data: biens } = await supabase
    .from('biens')
    .select('id, reference, type, adresse, ville, code_postal, prix, statut, a_verifier, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const addButton = (
    <Link href="/biens/nouveau">
      <BrikiiButton size="sm">Ajouter un bien</BrikiiButton>
    </Link>
  )

  return (
    <>
      <AppHeader title="Mes biens" actions={addButton} />

      {!biens || biens.length === 0 ? (
        <BrikiiCard className="flex flex-col items-center justify-center py-16 gap-4">
          <Building2 className="w-10 h-10 text-[var(--brikii-text-muted)]" />
          <p className="text-sm text-[var(--brikii-text-muted)]">Aucun bien pour le moment.</p>
          <Link href="/biens/nouveau">
            <BrikiiButton>Ajouter un bien</BrikiiButton>
          </Link>
        </BrikiiCard>
      ) : (
        <div className="flex flex-col gap-3">
          {biens.map(bien => {
            const statut = STATUT_LABELS[bien.statut] ?? { label: bien.statut, variant: 'neutral' as const }
            return (
              <Link key={bien.id} href={`/biens/${bien.id}`} className="block hover:opacity-80 transition-opacity">
                <BrikiiCard padding="sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--brikii-text)] truncate">
                          {TYPE_LABELS[bien.type] ?? bien.type}
                          {bien.ville ? ` · ${bien.ville}` : ''}
                          {bien.code_postal ? ` (${bien.code_postal})` : ''}
                        </span>
                        {bien.a_verifier && (
                          <BrikiiBadge variant="warning">A vérifier</BrikiiBadge>
                        )}
                      </div>
                      {bien.reference && (
                        <span className="text-xs text-[var(--brikii-text-muted)]">{bien.reference}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-[var(--brikii-text)]">
                        {formatPrix(bien.prix)}
                      </span>
                      <BrikiiBadge variant={statut.variant}>{statut.label}</BrikiiBadge>
                    </div>
                  </div>
                </BrikiiCard>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
