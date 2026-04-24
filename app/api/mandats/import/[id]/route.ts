import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('mandat_imports')
    .select('status, mandat_id, error_message, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })

  return NextResponse.json({
    status:        data.status,
    mandat_id:     data.mandat_id,
    error_message: data.error_message,
    created_at:    data.created_at,
  })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier l'ownership et récupérer le chemin storage
  const { data: importRow, error: fetchErr } = await supabase
    .from('mandat_imports')
    .select('id, source_url, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !importRow) {
    return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
  }

  // Un import déjà traité ne peut pas être supprimé côté UI
  if (importRow.status === 'completed') {
    return NextResponse.json({ error: 'Impossible de supprimer un import terminé.' }, { status: 409 })
  }

  const adminClient = createAdminClient()

  // Supprimer le fichier du bucket si le chemin est connu
  if (importRow.source_url && importRow.source_url.includes('/')) {
    const { error: removeErr } = await adminClient.storage
      .from('mandat-documents')
      .remove([importRow.source_url])

    if (removeErr) {
      console.error(`[mandats/import/delete] Storage remove échoué : ${removeErr.message}`)
      // Non fatal — on continue pour supprimer la ligne en base
    } else {
      console.log(`[mandats/import/delete] Fichier supprimé du bucket : ${importRow.source_url}`)
    }
  }

  // Supprimer la ligne mandat_imports
  const { error: deleteErr } = await supabase
    .from('mandat_imports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteErr) {
    console.error(`[mandats/import/delete] Suppression en base échouée : ${deleteErr.message}`)
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
  }

  console.log(`[mandats/import/delete] Import ${id} supprimé`)
  return NextResponse.json({ ok: true })
}
