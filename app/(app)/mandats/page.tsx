import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { FileText } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  exclusif:     'Exclusif',
  simple:       'Simple',
  semi_exclusif: 'Semi-exclusif',
  recherche:    'Recherche',
  gestion:      'Gestion',
}

const STATUT_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'yellow' }> = {
  brouillon:      { label: 'Brouillon',           variant: 'neutral' },
  import_en_cours: { label: 'Import en cours',     variant: 'info' },
  a_completer:    { label: 'À compléter',          variant: 'warning' },
  pret_a_valider: { label: 'Prêt à valider',       variant: 'yellow' },
  actif:          { label: 'Actif',                variant: 'success' },
}

const STATUT_METIER_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  expire:  { label: 'Expiré',  variant: 'danger' },
  resilie: { label: 'Résilié', variant: 'danger' },
  vendu:   { label: 'Vendu',   variant: 'info' },
  archive: { label: 'Archivé', variant: 'neutral' },
}

function formatPrix(prix: number | null): string {
  if (!prix) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix)
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

export default async function MandatsPage() {
  const supabase = await createClient()

  const { data: mandats } = await supabase
    .from('mandats')
    .select(`
      id, numero, type, statut, statut_metier,
      bien_id, date_debut, date_fin, prix_vente, honoraires_pct,
      bien:biens(ville, code_postal)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  const addButton = (
    <Link href="/mandats/nouveau">
      <BrikiiButton size="sm">Rattacher un mandat</BrikiiButton>
    </Link>
  )

  return (
    <>
      <AppHeader title="Mandats" actions={addButton} />

      {!mandats || mandats.length === 0 ? (
        <BrikiiCard className="flex flex-col items-center justify-center py-16 gap-4">
          <FileText className="w-10 h-10 text-[var(--brikii-text-muted)]" />
          <p className="text-sm text-[var(--brikii-text-muted)]">Aucun mandat pour le moment.</p>
          <Link href="/mandats/nouveau">
            <BrikiiButton>Rattacher un mandat</BrikiiButton>
          </Link>
        </BrikiiCard>
      ) : (
        <div className="flex flex-col gap-3">
          {mandats.map(m => {
            const statutCfg = STATUT_CONFIG[m.statut] ?? { label: m.statut, variant: 'neutral' as const }
            const metierCfg = m.statut_metier ? STATUT_METIER_CONFIG[m.statut_metier] : null
            const bien = m.bien as { ville?: string; code_postal?: string } | null
            const bienLabel = bien?.ville
              ? `${bien.ville}${bien.code_postal ? ` (${bien.code_postal})` : ''}`
              : 'Non rattaché'

            return (
              <Link key={m.id} href={`/mandats/${m.id}`} className="block hover:opacity-80 transition-opacity">
                <BrikiiCard padding="sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--brikii-text)]">
                          {TYPE_LABELS[m.type] ?? m.type}
                        </span>
                        <span className="text-sm text-[var(--brikii-text-muted)]">·</span>
                        <span className="text-sm text-[var(--brikii-text-muted)] truncate">{bienLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-[var(--brikii-text-muted)]">{m.numero}</span>
                        {m.date_fin && (
                          <span className="text-xs text-[var(--brikii-text-muted)]">
                            · fin {formatDate(m.date_fin)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[var(--brikii-text)]">
                          {formatPrix(m.prix_vente)}
                        </div>
                        {m.honoraires_pct != null && (
                          <div className="text-xs text-[var(--brikii-text-muted)]">
                            {m.honoraires_pct} %
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {metierCfg ? (
                          <BrikiiBadge variant={metierCfg.variant}>{metierCfg.label}</BrikiiBadge>
                        ) : (
                          <BrikiiBadge variant={statutCfg.variant}>{statutCfg.label}</BrikiiBadge>
                        )}
                      </div>
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
