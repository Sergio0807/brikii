import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { bienPhotoThumbUrl } from '@/lib/cloudflare-images'
import { FileText, Home } from 'lucide-react'

// ── Labels et configs ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  exclusif:      'Exclusif',
  simple:        'Simple',
  semi_exclusif: 'Semi-exclusif',
  recherche:     'Recherche',
  gestion:       'Gestion',
}

const STATUT_UI_CONFIG = {
  en_cours: { label: 'En cours', variant: 'success'  },
  expire:   { label: 'Expiré',  variant: 'danger'   },
  resilie:  { label: 'Résilié', variant: 'danger'   },
  vendu:    { label: 'Vendu',   variant: 'info'      },
  archive:  { label: 'Archivé', variant: 'neutral'   },
} as const

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

type PhotoShape = { url: string; ordre: number }

type BienShape = {
  id: string | null
  reference: string | null
  type: string | null
  ville: string | null
  code_postal: string | null
  surface_hab: number | null
  bien_photos: PhotoShape[] | null
}

type DocShape = { id: string; nom: string; taille: number | null }

type MandatRow = {
  id: string
  numero: string
  numero_mandat: string | null
  type: string
  statut: string
  statut_metier: string | null
  bien_id: string | null
  date_debut: string | null
  prix_vente: number | null
  honoraires_pct: number | null
  created_at: string
  // Supabase retourne la relation comme tableau ou objet selon le client — on accepte les deux
  bien: BienShape[] | BienShape | null
  documents: DocShape[] | null
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
      .select('id, numero, numero_mandat, type, statut, statut_metier, bien_id, date_debut, prix_vente, honoraires_pct, created_at, bien:biens(id, reference, type, ville, code_postal, surface_hab, bien_photos(url, ordre)), documents:mandat_documents(id, nom, taille)')
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

const BIEN_TYPE_LABELS: Record<string, string> = {
  maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain',
  immeuble: 'Immeuble', commerce: 'Commerce', local: 'Local', autre: 'Autre',
}

function BienPhoto({ photos, size = 'sm' }: { photos: PhotoShape[] | null | undefined; size?: 'sm' | 'md' }) {
  const sorted = photos ? [...photos].sort((a, b) => a.ordre - b.ordre) : []
  const firstUrl = sorted[0]?.url ?? null
  const thumbUrl = bienPhotoThumbUrl(firstUrl, size === 'sm' ? 120 : 200)

  const dim = size === 'sm'
    ? 'w-14 h-11 sm:w-20 sm:h-16 flex-shrink-0'
    : 'w-20 h-16 sm:w-28 sm:h-24 flex-shrink-0'

  if (!thumbUrl) {
    return (
      <div
        className={`${dim} flex items-center justify-center`}
        style={{ background: 'var(--brikii-bg-subtle)', borderRadius: 'var(--brikii-radius-input)' }}
      >
        <Home className="w-5 h-5 text-[var(--brikii-text-muted)]" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbUrl}
      alt="Photo du bien"
      className={`${dim} object-cover`}
      style={{ borderRadius: 'var(--brikii-radius-input)' }}
      loading="lazy"
    />
  )
}

function MandatCard({ mandat: m }: { mandat: MandatRow }) {
  const statutUiKey = (m.statut_metier as keyof typeof STATUT_UI_CONFIG | null) ?? 'en_cours'
  const statutUiCfg = STATUT_UI_CONFIG[statutUiKey] ?? STATUT_UI_CONFIG.en_cours
  const bien: BienShape | null = Array.isArray(m.bien) ? (m.bien[0] ?? null) : m.bien
  const docs = Array.isArray(m.documents) ? m.documents : []
  const primaryDoc: DocShape | null = docs[0] ?? null

  const bienTypeLabel = bien?.type ? BIEN_TYPE_LABELS[bien.type] ?? bien.type : null
  const bienRef = bien?.reference ?? bienTypeLabel
  const bienVille = bien?.ville ?? null

  return (
    <BrikiiCard padding="sm">
      <div className="flex items-start gap-3">

        {/* Miniature bien */}
        <BienPhoto photos={bien?.bien_photos} size="sm" />

        {/* Contenu */}
        <div className="flex items-start justify-between gap-4 flex-1 min-w-0">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">

            {/* Numéro + type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[var(--brikii-text)]">
                {m.numero_mandat ? `n° ${m.numero_mandat}` : 'Sans numéro'}
              </span>
              <span className="text-sm text-[var(--brikii-text-muted)]">—</span>
              <span className="text-sm text-[var(--brikii-text-muted)]">{TYPE_LABELS[m.type] ?? m.type}</span>
            </div>

            {/* Info bien */}
            {bien ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {bienRef && (
                  <span className="text-xs font-medium text-[var(--brikii-text)]">{bienRef}</span>
                )}
                {bienVille && (
                  <>
                    {bienRef && <span className="text-xs text-[var(--brikii-text-muted)]">·</span>}
                    <span className="text-xs text-[var(--brikii-text-muted)]">{bienVille}</span>
                  </>
                )}
                {bien.surface_hab && (
                  <>
                    <span className="text-xs text-[var(--brikii-text-muted)]">·</span>
                    <span className="text-xs text-[var(--brikii-text-muted)]">{bien.surface_hab} m²</span>
                  </>
                )}
              </div>
            ) : (
              <BrikiiBadge variant="neutral">Aucun bien rattaché</BrikiiBadge>
            )}

            {/* Date */}
            {m.date_debut && (
              <span className="text-xs text-[var(--brikii-text-muted)]">
                Début {formatDate(m.date_debut)}
              </span>
            )}

            {/* Indicateur document */}
            {primaryDoc ? (
              <div className="flex items-center gap-1.5 text-xs">
                <FileText className="w-3 h-3 shrink-0" style={{ color: '#22c55e' }} />
                <span
                  className="text-[var(--brikii-text-muted)] truncate"
                  style={{ maxWidth: 180 }}
                  title={primaryDoc.nom}
                >
                  {primaryDoc.nom}
                </span>
                {primaryDoc.taille && (
                  <span className="text-[var(--brikii-text-muted)] shrink-0">
                    · {Math.round(primaryDoc.taille / 1024)} ko
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--brikii-warning, #f59e0b)' }}>
                <FileText className="w-3 h-3 shrink-0" />
                <span>Document manquant</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Link href={`/mandats/${m.id}`}>
                <BrikiiButton variant="secondary" size="sm">Voir la fiche</BrikiiButton>
              </Link>
              {primaryDoc ? (
                <a
                  href={`/api/mandats/${m.id}/documents/${primaryDoc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BrikiiButton variant="ghost" size="sm">Voir le document</BrikiiButton>
                </a>
              ) : (
                <Link href={`/mandats/${m.id}`}>
                  <BrikiiButton variant="ghost" size="sm">Déposer le document</BrikiiButton>
                </Link>
              )}
              {!m.bien_id && (
                <Link href={`/mandats/${m.id}/rattacher-bien`}>
                  <BrikiiButton variant="ghost" size="sm">Rattacher un bien</BrikiiButton>
                </Link>
              )}
            </div>
          </div>

          {/* Statut + prix */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <BrikiiBadge variant={statutUiCfg.variant}>{statutUiCfg.label}</BrikiiBadge>
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
            <Link href={`/mandats/import/${imp.id}/rattacher`}>
              <BrikiiButton variant="secondary" size="sm">Rattacher à un bien existant</BrikiiButton>
            </Link>
            <Link href={`/biens/nouveau?mandat_import_id=${imp.id}`}>
              <BrikiiButton variant="secondary" size="sm">Créer le bien correspondant</BrikiiButton>
            </Link>
            {hasFile && (
              <a href={`/api/mandats/import/${imp.id}/document`} target="_blank" rel="noopener noreferrer">
                <BrikiiButton variant="ghost" size="sm">Ouvrir le document</BrikiiButton>
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
