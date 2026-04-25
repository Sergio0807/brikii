import { BienForm } from './BienForm'
import { AppHeader } from '@/components/shared/AppHeader'

type PageProps = { searchParams: Promise<{ mandat_import_id?: string }> }

export default async function NouveauBienPage({ searchParams }: PageProps) {
  const { mandat_import_id } = await searchParams
  return (
    <>
      <AppHeader title="Ajouter un bien" />
      <BienForm mandatImportId={mandat_import_id ?? null} />
    </>
  )
}
