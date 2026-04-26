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

const STATUT_UI_CONFIG = {
  en_cours: { label: 'En cours', variant: 'success'  },
  expire:   { label: 'Expiré',  variant: 'danger'   },
  resilie:  { label: 'Résilié', variant: 'danger'   },
  vendu:    { label: 'Vendu',   variant: 'info'      },
  archive:  { label: 'Archivé', variant: 'neutral'   },
} as const

type PageProps = { params: Promise<{ id: string }> }

export default async function MandatPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: mandat } = await supabase
    .from('mandats')
    .select(`
      *,
      bien:biens(id, reference, type, statut, deleted_at, ville, code_postal, prix, surface_hab, bien_photos(url, ordre)),
      proprietaires:mandat_proprietaires(
        id, role, ordre, nature_droit, quote_part_numerateur, quote_part_denominateur, source_bien_proprietaire_id,
        contact:contacts!mandat_proprietaires_contact_id_fkey(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone),
        representant:contacts!mandat_proprietaires_representant_contact_id_fkey(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone)
      ),
      documents:mandat_documents(id, type, nom, url, taille, created_at)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!mandat) notFound()

  const typeLabel = TYPE_LABELS[mandat.type] ?? mandat.type
  const statutUiKey = (mandat.statut_metier as keyof typeof STATUT_UI_CONFIG | null) ?? 'en_cours'
  const statutUiCfg = STATUT_UI_CONFIG[statutUiKey] ?? STATUT_UI_CONFIG.en_cours

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
      <BrikiiBadge variant={statutUiCfg.variant}>{statutUiCfg.label}</BrikiiBadge>
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
