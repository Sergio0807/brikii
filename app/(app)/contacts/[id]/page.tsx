import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiBadge } from '@/components/shared/BrikiiBadge'
import { ContactDetail } from './ContactDetail'

type PageProps = { params: Promise<{ id: string }> }

export default async function ContactPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!contact) notFound()

  const [rolesRes, biensRes, interactionsRes] = await Promise.all([
    supabase
      .from('contact_roles')
      .select('type, actif')
      .eq('contact_id', id)
      .order('actif', { ascending: false }),

    supabase
      .from('contact_biens')
      .select('id, role, bien:biens!contact_biens_bien_id_fkey(id, reference, type, ville, statut)')
      .eq('contact_id', id),

    supabase
      .from('contact_interactions')
      .select('id, type, titre, contenu, date_inter, created_at')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const displayName = contact.personne_type === 'morale'
    ? (contact.raison_sociale ?? 'Contact')
    : [contact.prenom, contact.nom].filter(Boolean).join(' ') || (contact.email ?? 'Contact')

  const statut = contact.statut as string
  const statutBadge = statut === 'inactif'
    ? <BrikiiBadge variant="neutral">Inactif</BrikiiBadge>
    : statut === 'archive'
      ? <BrikiiBadge variant="neutral">Archivé</BrikiiBadge>
      : null

  const back = (
    <Link href="/contacts" className="text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors">
      ← Contacts
    </Link>
  )

  const subtitle = statutBadge ? (
    <div className="flex items-center gap-1.5 mt-0.5">{statutBadge}</div>
  ) : undefined

  return (
    <>
      <AppHeader back={back} title={displayName} subtitle={subtitle} />
      <ContactDetail
        contact={contact}
        roles={rolesRes.data ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        biens={(biensRes.data ?? []) as any[]}
        interactions={interactionsRes.data ?? []}
      />
    </>
  )
}
