import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { RattacherMandatBienSelector } from './RattacherMandatBienSelector'
import { ChevronLeft } from 'lucide-react'

type PageProps = { params: Promise<{ id: string }> }

export default async function RattacherMandatBienPage({ params }: PageProps) {
  const { id: mandatId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Charger le mandat
  const { data: mandat } = await supabase
    .from('mandats')
    .select('id, bien_id, type, numero_mandat, numero')
    .eq('id', mandatId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!mandat) notFound()

  // Charger les biens de l'utilisateur
  const { data: biens } = await supabase
    .from('biens')
    .select('id, reference, type, adresse, ville, code_postal')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  const mandatLabel = mandat.numero_mandat ? `n° ${mandat.numero_mandat}` : mandat.numero

  const back = (
    <Link
      href={`/mandats/${mandatId}`}
      className="flex items-center gap-1 text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors"
    >
      <ChevronLeft className="w-3 h-3" />
      Mandat {mandatLabel}
    </Link>
  )

  const actions = (
    <Link href={`/biens/nouveau`}>
      <BrikiiButton variant="secondary" size="sm">Créer un nouveau bien</BrikiiButton>
    </Link>
  )

  return (
    <>
      <AppHeader
        title="Rattacher un bien"
        back={back}
        actions={actions}
      />

      {!biens || biens.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-[var(--brikii-text-muted)]">
            Vous n&apos;avez encore aucun bien enregistré.
          </p>
          <Link href="/biens/nouveau">
            <BrikiiButton>Créer le bien correspondant</BrikiiButton>
          </Link>
        </div>
      ) : (
        <RattacherMandatBienSelector
          mandatId={mandatId}
          biens={biens}
          currentBienId={mandat.bien_id}
        />
      )}
    </>
  )
}
