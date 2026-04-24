import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { MandatForm } from './MandatForm'

type PageProps = { searchParams: Promise<{ bien_id?: string }> }

export default async function NouveauMandatPage({ searchParams }: PageProps) {
  const { bien_id } = await searchParams

  let bienLabel: string | null = null
  if (bien_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('biens')
      .select('reference, type, ville, code_postal')
      .eq('id', bien_id)
      .single()

    if (data) {
      const parts = [
        data.reference,
        data.ville,
        data.code_postal ? `(${data.code_postal})` : null,
      ].filter(Boolean)
      bienLabel = parts.join(' · ')
    }
  }

  const back = (
    <Link
      href={bien_id ? `/biens/${bien_id}` : '/mandats'}
      className="text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors"
    >
      {bien_id ? '← Fiche bien' : '← Mandats'}
    </Link>
  )

  return (
    <>
      <AppHeader
        back={back}
        title={bien_id ? 'Rattacher un mandat' : 'Associer un mandat'}
        subtitle={bienLabel ? <span className="text-xs text-[var(--brikii-text-muted)]">{bienLabel}</span> : undefined}
      />
      <MandatForm bienId={bien_id ?? null} bienLabel={bienLabel} />
    </>
  )
}
