import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/shared/AppHeader'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { RattacherBienSelector } from './RattacherBienSelector'
import { ChevronLeft } from 'lucide-react'

type PageProps = { params: Promise<{ id: string }> }

function fileNameFromPath(sourcePath: string | null): string {
  if (!sourcePath) return 'Document importé'
  return sourcePath.split('/').pop() ?? sourcePath
}

export default async function RattacherBienPage({ params }: PageProps) {
  const { id: importId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Charger l'import — vérifier ownership
  const { data: importRow } = await supabase
    .from('mandat_imports')
    .select('id, source_url, status, mandat_id')
    .eq('id', importId)
    .eq('user_id', user.id)
    .single()

  if (!importRow) redirect('/mandats')

  // Déjà rattaché → aller directement sur la fiche mandat
  if (importRow.mandat_id) redirect(`/mandats/${importRow.mandat_id}`)

  // Charger les biens de l'utilisateur
  const { data: biens } = await supabase
    .from('biens')
    .select('id, reference, type, adresse, ville, code_postal')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  const fileName = fileNameFromPath(importRow.source_url)

  const back = (
    <Link href="/mandats" className="flex items-center gap-1 text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors">
      <ChevronLeft className="w-3 h-3" />
      Mandats
    </Link>
  )

  const actions = (
    <Link href={`/biens/nouveau?mandat_import_id=${importId}`}>
      <BrikiiButton variant="secondary" size="sm">Créer un nouveau bien</BrikiiButton>
    </Link>
  )

  return (
    <>
      <AppHeader
        title="Rattacher à un bien"
        back={back}
        actions={actions}
      />

      {!biens || biens.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-[var(--brikii-text-muted)]">
            Vous n&apos;avez encore aucun bien enregistré.
          </p>
          <Link href={`/biens/nouveau?mandat_import_id=${importId}`}>
            <BrikiiButton>Créer le bien correspondant</BrikiiButton>
          </Link>
        </div>
      ) : (
        <RattacherBienSelector
          importId={importId}
          fileName={fileName}
          biens={biens}
        />
      )}
    </>
  )
}
