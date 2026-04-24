import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BienDetail } from './BienDetail'

const SOUS_TABLE: Partial<Record<string, string>> = {
  maison: 'biens_maisons',
  appartement: 'biens_appartements',
  terrain: 'biens_terrains',
  immeuble: 'biens_immeubles',
  commerce: 'biens_commerces',
}

const TYPE_LABELS: Record<string, string> = {
  maison: 'Maison', appartement: 'Appartement', terrain: 'Terrain',
  immeuble: 'Immeuble', commerce: 'Commerce', local: 'Local', autre: 'Autre',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', sur_le_marche: 'Sur le marché',
  sous_offre: 'Sous offre', vendu: 'Vendu', archive: 'Archivé',
}
const STATUT_VARIANTS: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  brouillon: 'neutral', sur_le_marche: 'success',
  sous_offre: 'warning', vendu: 'info', archive: 'neutral',
}

type PageProps = { params: Promise<{ id: string }> }

export default async function BienPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: bien } = await supabase
    .from('biens')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!bien) notFound()

  const sousTable = SOUS_TABLE[bien.type]
  let details = null
  if (sousTable) {
    const { data } = await supabase
      .from(sousTable)
      .select('*')
      .eq('bien_id', id)
      .maybeSingle()
    details = data
  }

  const { data: photos } = await supabase
    .from('bien_photos')
    .select('id, url, ordre')
    .eq('bien_id', id)
    .order('ordre', { ascending: true })

  const { data: mandats } = await supabase
    .from('mandats')
    .select('id, numero, type, statut, statut_metier, date_debut, date_fin, prix_vente, honoraires_pct')
    .eq('bien_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const title = [
    bien.reference,
    [TYPE_LABELS[bien.type] ?? bien.type, bien.ville].filter(Boolean).join(' '),
  ].filter(Boolean).join(' · ')

  const back = (
    <Link
      href="/biens"
      className="text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors"
    >
      ← Mes biens
    </Link>
  )

  const subtitle = (
    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
      <BrikiiBadge variant={STATUT_VARIANTS[bien.statut] ?? 'neutral'}>
        {STATUT_LABELS[bien.statut] ?? bien.statut}
      </BrikiiBadge>
      {bien.a_verifier && <BrikiiBadge variant="warning">À vérifier</BrikiiBadge>}
    </div>
  )

  const actions = (
    <>
      <BrikiiButton variant="ghost" size="sm" disabled>Exporter</BrikiiButton>
      <BrikiiButton size="sm" disabled>Ajouter à un pool</BrikiiButton>
    </>
  )

  return (
    <>
      <AppHeader back={back} title={title} subtitle={subtitle} actions={actions} />
      <BienDetail bien={{ ...bien, details, photos: photos ?? [] }} mandats={mandats ?? []} />
    </>
  )
}
