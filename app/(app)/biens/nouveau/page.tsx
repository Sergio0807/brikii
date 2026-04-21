import { BienForm } from './BienForm'
import { AppHeader } from '@/components/shared/AppHeader'

export default function NouveauBienPage() {
  return (
    <>
      <AppHeader title="Ajouter un bien" />
      <BienForm />
    </>
  )
}
