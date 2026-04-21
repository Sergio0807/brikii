import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { ProfileForm } from './ProfileForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('civilite, prenom, nom, telephone, statut_professionnel, siren, rsac, agence_mandant_id, agence_mandant')
        .eq('id', user.id)
        .single()
    : { data: null }

  return (
    <>
      <AppHeader title="Paramètres" subtitle="Informations personnelles" />
      <ProfileForm profile={profile} />
    </>
  )
}
