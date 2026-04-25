import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
])
const MAX_SIZE = 20 * 1024 * 1024
const BUCKET = 'mandat-documents'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
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

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Requête invalide (multipart attendu)' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  }

  const isHeic = /\.heic?$|\.heif$/i.test(file.name)
  if (!ALLOWED_TYPES.has(file.type) && !isHeic) {
    return NextResponse.json(
      { error: 'Format non supporté. Utilisez PDF, JPG, PNG ou HEIC.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo).' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Remplacement atomique : supprimer l'ancien document si replace_id fourni
  const replaceId = formData.get('replace_id')
  if (replaceId && typeof replaceId === 'string') {
    const { data: oldDoc } = await supabase
      .from('mandat_documents')
      .select('id, url')
      .eq('id', replaceId)
      .eq('mandat_id', id)
      .single()
    if (oldDoc) {
      if (!oldDoc.url.startsWith('http')) {
        await adminClient.storage.from(BUCKET).remove([oldDoc.url])
      }
      await supabase.from('mandat_documents').delete().eq('id', replaceId)
    }
  }

  // Upload dans le bucket — chemin {user_id}/{mandat_id}/{filename}
  const storagePath = `${user.id}/${id}/${file.name}`
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(bytes), {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })
  if (uploadErr) {
    return NextResponse.json({ error: `Erreur upload : ${uploadErr.message}` }, { status: 500 })
  }

  const { data: doc, error: insertErr } = await supabase
    .from('mandat_documents')
    .insert({
      mandat_id: id,
      user_id:   user.id,
      type:      'mandat_pdf',
      nom:       file.name,
      url:       storagePath,
      taille:    file.size,
    })
    .select('id, type, nom, url, taille, created_at')
    .single()

  if (insertErr || !doc) {
    return NextResponse.json({ error: 'Erreur enregistrement document' }, { status: 500 })
  }

  return NextResponse.json(doc, { status: 201 })
}
