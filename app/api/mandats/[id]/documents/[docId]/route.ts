import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string; docId: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id, docId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier ownership du mandat
  const { data: mandat } = await supabase
    .from('mandats')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!mandat) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  // Récupérer le document
  const { data: doc } = await supabase
    .from('mandat_documents')
    .select('url')
    .eq('id', docId)
    .eq('mandat_id', id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  // URL complète (ex. depuis n8n) → redirection directe
  if (doc.url.startsWith('http')) {
    return NextResponse.redirect(doc.url)
  }

  // Chemin de stockage → URL signée 1h
  const adminClient = createAdminClient()
  const { data: signed, error } = await adminClient.storage
    .from('mandat-documents')
    .createSignedUrl(doc.url, 3600)

  if (error || !signed) {
    return NextResponse.json({ error: 'Impossible de générer l\'URL du document' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id, docId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: mandat } = await supabase
    .from('mandats')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()
  if (!mandat) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { data: doc } = await supabase
    .from('mandat_documents')
    .select('id, url')
    .eq('id', docId)
    .eq('mandat_id', id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  if (!doc.url.startsWith('http')) {
    const adminClient = createAdminClient()
    await adminClient.storage.from('mandat-documents').remove([doc.url])
  }

  const { error } = await supabase
    .from('mandat_documents')
    .delete()
    .eq('id', docId)
    .eq('mandat_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
