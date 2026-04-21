import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { UserProvider, type UserProfile } from '@/providers/user-provider'
import { PageLayout } from '@/components/shared/PageLayout'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? '/dashboard'
    return redirect(`/login?redirect=${encodeURIComponent(pathname)}`)
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('prenom, nom, statut_professionnel, avatar_url')
    .eq('id', user.id)
    .single()

  const profile: UserProfile | null = profileData
    ? {
        prenom:               profileData.prenom ?? null,
        nom:                  profileData.nom ?? null,
        statut_professionnel: profileData.statut_professionnel ?? null,
        avatar_url:           profileData.avatar_url ?? null,
      }
    : null

  return (
    <UserProvider user={user} profile={profile}>
      <PageLayout profile={profile}>
        {children}
      </PageLayout>
    </UserProvider>
  )
}
