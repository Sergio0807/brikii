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
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 Mo

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Lecture du fichier depuis FormData
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Requête invalide (multipart attendu)' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  }

  // Validation type
  const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
  if (!ALLOWED_TYPES.has(file.type) && !isHeic) {
    return NextResponse.json(
      { error: 'Format non supporté. Utilisez PDF, JPG, PNG ou HEIC.' },
      { status: 400 }
    )
  }

  // Validation taille
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo).' }, { status: 400 })
  }

  // Créer l'import en base (status pending)
  const { data: importRow, error: insertErr } = await supabase
    .from('mandat_imports')
    .insert({ user_id: user.id, source_url: file.name, status: 'pending' })
    .select('id')
    .single()

  if (insertErr || !importRow) {
    return NextResponse.json({ error: 'Erreur création import' }, { status: 500 })
  }

  // Upload dans Supabase Storage via admin client (bypass RLS bucket)
  const adminClient = createAdminClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${user.id}/${importRow.id}.${ext}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadErr } = await adminClient.storage
    .from('mandat-documents')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadErr) {
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: `Erreur upload : ${uploadErr.message}` })
      .eq('id', importRow.id)
    console.error('[mandats/import] Upload Storage:', uploadErr.message)
    return NextResponse.json({ error: `Erreur upload fichier : ${uploadErr.message}` }, { status: 500 })
  }

  // Mettre à jour source_url avec le chemin réel
  await supabase
    .from('mandat_imports')
    .update({ source_url: storagePath })
    .eq('id', importRow.id)

  // Vérifier si n8n est configuré
  const webhookUrl = process.env.N8N_MANDAT_WEBHOOK_URL
  if (!webhookUrl) {
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: 'N8N_MANDAT_WEBHOOK_URL non configuré' })
      .eq('id', importRow.id)
    return NextResponse.json({ error: 'Import n8n non configuré' }, { status: 502 })
  }

  // Générer une URL signée (1h) pour que n8n puisse récupérer le fichier
  const { data: signed, error: signErr } = await adminClient.storage
    .from('mandat-documents')
    .createSignedUrl(storagePath, 3600)

  if (signErr || !signed?.signedUrl) {
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: 'Impossible de générer l\'URL signée' })
      .eq('id', importRow.id)
    return NextResponse.json({ error: 'Erreur génération URL signée' }, { status: 500 })
  }

  // Appel n8n — fire and no-wait
  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url:  signed.signedUrl,
        file_name: file.name,
        import_id: importRow.id,
        user_id:   user.id,
      }),
    })

    if (!n8nRes.ok) {
      throw new Error(`n8n HTTP ${n8nRes.status}`)
    }

    await supabase
      .from('mandat_imports')
      .update({ status: 'processing' })
      .eq('id', importRow.id)

    return NextResponse.json({ import_id: importRow.id }, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur n8n inconnue'
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: `Impossible de joindre n8n : ${message}` })
      .eq('id', importRow.id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
