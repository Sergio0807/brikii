import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { LogoutButton } from './LogoutButton'
import { AppHeader } from '@/components/shared/AppHeader'

export default function DashboardPage() {
  return (
    <>
      <AppHeader title="Tableau de bord" actions={<LogoutButton />} />
      <BrikiiCard>
        <p className="text-sm text-[var(--brikii-text)]">Bienvenue sur Brikii 👋</p>
      </BrikiiCard>
    </>
  )
}
