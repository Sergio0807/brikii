import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { ContactsList } from './ContactsList'

export default async function ContactsPage() {
  const supabase = await createClient()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone, ville, types, statut, score, created_at')
    .is('deleted_at', null)
    .order('nom', { ascending: true, nullsFirst: false })
    .limit(200)

  const addButton = (
    <Link href="/contacts/nouveau">
      <BrikiiButton size="sm">+ Nouveau contact</BrikiiButton>
    </Link>
  )

  return (
    <>
      <AppHeader title="Contacts" actions={addButton} />
      <ContactsList contacts={contacts ?? []} />
    </>
  )
}
