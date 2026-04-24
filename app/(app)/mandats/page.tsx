import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { FileText } from 'lucide-react'

// ── Labels et configs ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  exclusif:      'Exclusif',
  simple:        'Simple',
  semi_exclusif: 'Semi-exclusif',
  recherche:     'Recherche',
  gestion:       'Gestion',
}

const STATUT_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'yellow' }> = {
  brouillon:       { label: 'Brouillon',        variant: 'neutral'  },
  import_en_cours: { label: 'Import en cours',  variant: 'info'     },
  a_completer:     { label: 'À compléter',       variant: 'warning'  },
  pret_a_valider:  { label: 'Prêt à valider',    variant: 'yellow'   },
  actif:           { label: 'Actif',             variant: 'success'  },
}

const STATUT_METIER_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  expire:  { label: 'Expiré',  variant: 'danger'  },
  resilie: { label: 'Résilié', variant: 'danger'  },
  vendu:   { label: 'Vendu',   variant: 'info'    },
  archive: { label: 'Archivé', variant: 'neutral' },
}

const IMPORT_STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  pending:    { label: 'En attente',        variant: 'neutral' },
  processing: { label: 'Analyse en cours',  variant: 'info'    },
  error:      { label: 'Erreur d\'analyse', variant: 'danger'  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrix(prix: number | null): string {
  if (!prix) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix)
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

function fileNameFromPath(sourcePath: string | null): string {
  if (!sourcePath) return 'Document'
  return sourcePath.split('/').pop() ?? sourcePath
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MandatRow = {
  id: string
  numero: string
  type: string
  statut: string
  statut_metier: string | null
  bien_id: string | null
  date_debut: string | null
  prix_vente: number | null
  honoraires_pct: number | null
  created_at: string
  bien: { ville: string | null; code_postal: string | null } | null
}

type ImportRow = {
  id: string
  source_url: string | null
  status: string
  error_message: string | null
  created_at: string
}

type ListItem =
  | { kind: 'mandat'; created_at: string; data: MandatRow }
  | { kind: 'import'; created_at: string; data: ImportRow }

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MandatsPage() {
  const supabase = await createClient()

  const [{ data: mandats }, { data: imports }] = await Promise.all([
    supabase
      .from('mandats')
      .select('id, numero, type, statut, statut_metier, bien_id, date_debut, prix_vente, honoraires_pct, created_at, bien:biens(ville, code_postal)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100),

    // Imports sans mandat créé (n8n non configuré, en cours, ou en erreur)
    supabase
      .from('mandat_imports')
      .select('id, source_url, status, error_message, created_at')
      .is('mandat_id', null)
      .in('status', ['pending', 'processing', 'error'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Fusionner et trier par date décroissante
  const items: ListItem[] = [
    ...(mandats ?? []).map(m => ({ kind: 'mandat' as const, created_at: m.created_at, data: m as MandatRow })),
    ...(imports ?? []).map(i => ({ kind: 'import' as const, created_at: i.created_at, data: i as ImportRow })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const addButton = (
    <Link href="/mandats/nouveau">
      <BrikiiButton size="sm">Rattacher un mandat</BrikiiButton>
    </Link>
  )

  return (
    <>
      <AppHeader title="Mandats" actions={addButton} />

      {items.length === 0 ? (
        <BrikiiCard className="flex flex-col items-center justify-center py-16 gap-4">
          <FileText className="w-10 h-10 text-[var(--brikii-text-muted)]" />
          <p className="text-sm text-[var(--brikii-text-muted)]">Aucun mandat pour le moment.</p>
          <Link href="/mandats/nouveau">
            <BrikiiButton>Rattacher un mandat</BrikiiButton>
          </Link>
        </BrikiiCard>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item =>
            item.kind === 'mandat'
              ? <MandatCard key={`m-${item.data.id}`} mandat={item.data} />
              : <ImportCard key={`i-${item.data.id}`} imp={item.data} />
          )}
        </div>
      )}
    </>
  )
}

// ── Carte Mandat ──────────────────────────────────────────────────────────────

function MandatCard({ mandat: m }: { mandat: MandatRow }) {
  const statutCfg = STATUT_CONFIG[m.statut] ?? { label: m.statut, variant: 'neutral' as const }
  const metierCfg = m.statut_metier ? STATUT_METIER_CONFIG[m.statut_metier] : null
  const bien = m.bien as { ville?: string | null; code_postal?: string | null } | null
  const bienLabel = bien?.ville
    ? `${bien.ville}${bien.code_postal ? ` (${bien.code_postal})` : ''}`
    : null

  return (
    <BrikiiCard padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[var(--brikii-text)]">
              {TYPE_LABELS[m.type] ?? m.type}
            </span>
            {bienLabel ? (
              <>
                <span className="text-sm text-[var(--brikii-text-muted)]">·</span>
                <span className="text-sm text-[var(--brikii-text-muted)] truncate">{bienLabel}</span>
              </>
            ) : (
              <BrikiiBadge variant="neutral">Aucun bien rattaché</BrikiiBadge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-[var(--brikii-text-muted)]">{m.numero}</span>
            {m.date_debut && (
              <span className="text-xs text-[var(--brikii-text-muted)]">
                · début {formatDate(m.date_debut)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Link href={`/mandats/${m.id}`}>
              <BrikiiButton variant="secondary" size="sm">Ouvrir</BrikiiButton>
            </Link>
            {!m.bien_id && (
              <Link href={`/mandats/${m.id}`}>
                <BrikiiButton variant="ghost" size="sm">Rattacher à un bien</BrikiiButton>
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {metierCfg ? (
            <BrikiiBadge variant={metierCfg.variant}>{metierCfg.label}</BrikiiBadge>
          ) : (
            <BrikiiBadge variant={statutCfg.variant}>{statutCfg.label}</BrikiiBadge>
          )}
          {m.prix_vente != null && m.prix_vente > 0 && (
            <div className="text-right">
              <div className="text-sm font-semibold text-[var(--brikii-text)]">
                {formatPrix(m.prix_vente)}
              </div>
              {m.honoraires_pct != null && (
                <div className="text-xs text-[var(--brikii-text-muted)]">{m.honoraires_pct} %</div>
              )}
            </div>
          )}
        </div>
      </div>
    </BrikiiCard>
  )
}

// ── Carte Import ──────────────────────────────────────────────────────────────

function ImportCard({ imp }: { imp: ImportRow }) {
  const statusCfg = IMPORT_STATUS_CONFIG[imp.status] ?? { label: imp.status, variant: 'neutral' as const }
  const fileName   = fileNameFromPath(imp.source_url)
  const hasFile    = !!imp.source_url?.includes('/')

  return (
    <BrikiiCard padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[var(--brikii-text)]">
              Mandat importé à compléter
            </span>
            <BrikiiBadge variant="neutral">Aucun bien rattaché</BrikiiBadge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--brikii-text-muted)]">
            <span>📄</span>
            <span className="truncate">{fileName}</span>
            <span>·</span>
            <span>Déposé le {formatDate(imp.created_at)}</span>
          </div>

          {imp.status === 'error' && imp.error_message && (
            <p className="text-xs text-[var(--brikii-danger)] truncate">{imp.error_message}</p>
          )}

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {hasFile && (
              <a href={`/api/mandats/import/${imp.id}/document`} target="_blank" rel="noopener noreferrer">
                <BrikiiButton variant="secondary" size="sm">Ouvrir le document</BrikiiButton>
              </a>
            )}
            <Link href="/mandats/nouveau">
              <BrikiiButton variant="ghost" size="sm">Compléter manuellement</BrikiiButton>
            </Link>
          </div>
        </div>

        <div className="shrink-0">
          <BrikiiBadge variant={statusCfg.variant}>{statusCfg.label}</BrikiiBadge>
        </div>
      </div>
    </BrikiiCard>
  )
}
