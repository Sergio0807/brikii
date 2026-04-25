import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { MandatDetail } from './MandatDetail'

const TYPE_LABELS: Record<string, string> = {
  exclusif:      'Exclusif',
  simple:        'Simple',
  semi_exclusif: 'Semi-exclusif',
  recherche:     'Recherche',
  gestion:       'Gestion',
}

const STATUT_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'yellow' }> = {
  brouillon:       { label: 'Brouillon',       variant: 'neutral' },
  import_en_cours: { label: 'Import en cours',  variant: 'info' },
  a_completer:     { label: 'À compléter',      variant: 'warning' },
  pret_a_valider:  { label: 'Prêt à valider',   variant: 'yellow' },
  actif:           { label: 'Actif',            variant: 'success' },
}

const STATUT_METIER_CONFIG: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  expire:  { label: 'Expiré',  variant: 'danger' },
  resilie: { label: 'Résilié', variant: 'danger' },
  vendu:   { label: 'Vendu',   variant: 'info' },
  archive: { label: 'Archivé', variant: 'neutral' },
}

type PageProps = { params: Promise<{ id: string }> }

export default async function MandatPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: mandat } = await supabase
    .from('mandats')
    .select(`
      *,
      bien:biens(id, reference, type, ville, code_postal, prix, surface_hab, bien_photos(url, ordre)),
      proprietaires:mandat_proprietaires(
        id, role, ordre,
        contact:contacts(id, prenom, nom, email, telephone)
      ),
      documents:mandat_documents(id, type, nom, url, taille, created_at)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!mandat) notFound()

  const typeLabel = TYPE_LABELS[mandat.type] ?? mandat.type
  const statutCfg = STATUT_CONFIG[mandat.statut] ?? { label: mandat.statut, variant: 'neutral' as const }
  const metierCfg = mandat.statut_metier ? STATUT_METIER_CONFIG[mandat.statut_metier] : null

  const back = (
    <Link
      href="/mandats"
      className="text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors"
    >
      ← Mandats
    </Link>
  )

  const subtitle = (
    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
      {metierCfg ? (
        <BrikiiBadge variant={metierCfg.variant}>{metierCfg.label}</BrikiiBadge>
      ) : (
        <BrikiiBadge variant={statutCfg.variant}>{statutCfg.label}</BrikiiBadge>
      )}
    </div>
  )

  return (
    <>
      <AppHeader
        back={back}
        title={mandat.numero_mandat ? `Mandat n° ${mandat.numero_mandat} — ${typeLabel}` : `Mandat sans numéro — ${typeLabel}`}
        subtitle={subtitle}
      />
      <MandatDetail mandat={mandat} />
    </>
  )
}
