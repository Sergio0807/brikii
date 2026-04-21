'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BrikiiButton } from '@/components/shared/BrikiiButton'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <BrikiiButton variant="ghost" size="sm" onClick={handleLogout}>
      Déconnexion
    </BrikiiButton>
  )
}
