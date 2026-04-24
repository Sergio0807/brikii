import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: importRow, error } = await supabase
    .from('mandat_imports')
    .select('source_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !importRow) {
    return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
  }

  // source_url est un path storage (user_id/import_id/fichier) seulement après upload
  if (!importRow.source_url || !importRow.source_url.includes('/')) {
    return NextResponse.json({ error: 'Fichier non encore disponible' }, { status: 404 })
  }

  const adminClient = createAdminClient()
  const { data: signed, error: signErr } = await adminClient.storage
    .from('mandat-documents')
    .createSignedUrl(importRow.source_url, 3600)

  if (signErr || !signed?.signedUrl) {
    console.error(`[mandats/import/document] Signed URL échouée pour ${id}: ${signErr?.message}`)
    return NextResponse.json({ error: 'Impossible de générer l\'URL du document' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
