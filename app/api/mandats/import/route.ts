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
const BUCKET = 'mandat-documents'

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

  console.log(`[mandats/import] Fichier reçu : name="${file.name}" type="${file.type}" size=${file.size} user=${user.id}`)

  // Validation type
  const isHeic = /\.heic?$|\.heif$/i.test(file.name)
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

  // ── Étape 1 : créer l'import en base ─────────────────────────────────────

  const { data: importRow, error: insertErr } = await supabase
    .from('mandat_imports')
    .insert({ user_id: user.id, source_url: file.name, status: 'pending' })
    .select('id')
    .single()

  if (insertErr || !importRow) {
    console.error('[mandats/import] Création import en base:', insertErr?.message)
    return NextResponse.json({ error: 'Erreur création import' }, { status: 500 })
  }

  console.log(`[mandats/import] Import créé en base : id=${importRow.id}`)

  // ── Étape 2 : upload dans Supabase Storage ────────────────────────────────

  const adminClient = createAdminClient()
  const storagePath = `${user.id}/${importRow.id}/${file.name}`

  console.log(`[mandats/import] Début upload → bucket="${BUCKET}" path="${storagePath}"`)

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  console.log(`[mandats/import] Buffer prêt : ${buffer.byteLength} octets`)

  const { data: uploadData, error: uploadErr } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadErr) {
    console.error(`[mandats/import] Erreur upload Storage : ${uploadErr.message}`, uploadErr)
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: `Erreur upload : ${uploadErr.message}` })
      .eq('id', importRow.id)
    return NextResponse.json({ error: `Erreur upload fichier : ${uploadErr.message}` }, { status: 500 })
  }

  console.log(`[mandats/import] Upload Storage OK : path="${uploadData?.path}" fullPath="${uploadData?.fullPath}"`)

  // ── Étape 3 : vérifier que le fichier existe bien (signed URL) ────────────
  // Cette étape sert de preuve d'existence — si createSignedUrl échoue,
  // le fichier n'a pas atterri dans le bucket malgré l'absence d'erreur d'upload.

  const { data: signed, error: signErr } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 300) // 5 min suffisent pour cette vérification

  if (signErr || !signed?.signedUrl) {
    console.error(`[mandats/import] Vérification post-upload échouée : ${signErr?.message ?? 'URL signée absente'}`)
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: `Fichier non trouvé après upload : ${signErr?.message ?? 'URL signée absente'}` })
      .eq('id', importRow.id)
    return NextResponse.json({ error: 'Fichier introuvable dans le bucket après upload.' }, { status: 500 })
  }

  console.log(`[mandats/import] Fichier vérifié dans Storage ✓`)

  // Mettre à jour le chemin réel en base
  await supabase
    .from('mandat_imports')
    .update({ source_url: storagePath })
    .eq('id', importRow.id)

  // ── Étape 4 : appel n8n si configuré (optionnel) ──────────────────────────

  const webhookUrl = process.env.N8N_MANDAT_WEBHOOK_URL
  if (!webhookUrl) {
    console.log(`[mandats/import] N8N_MANDAT_WEBHOOK_URL absent — upload seul, pas d'analyse automatique`)
    return NextResponse.json(
      { import_id: importRow.id, n8n_available: false, storage_path: storagePath },
      { status: 202 }
    )
  }

  // Générer une URL signée longue (1h) pour que n8n récupère le fichier
  const { data: signedLong, error: signLongErr } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (signLongErr || !signedLong?.signedUrl) {
    console.error(`[mandats/import] URL signée 1h échouée : ${signLongErr?.message}`)
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: 'Impossible de générer l\'URL signée pour n8n' })
      .eq('id', importRow.id)
    return NextResponse.json({ error: 'Erreur génération URL signée' }, { status: 500 })
  }

  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url:  signedLong.signedUrl,
        file_name: file.name,
        import_id: importRow.id,
        user_id:   user.id,
      }),
    })

    if (!n8nRes.ok) throw new Error(`n8n HTTP ${n8nRes.status}`)

    console.log(`[mandats/import] n8n notifié — import ${importRow.id} en traitement`)

    await supabase
      .from('mandat_imports')
      .update({ status: 'processing' })
      .eq('id', importRow.id)

    return NextResponse.json(
      { import_id: importRow.id, n8n_available: true, storage_path: storagePath },
      { status: 202 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur n8n inconnue'
    console.error(`[mandats/import] Erreur appel n8n : ${message}`)
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: `Impossible de joindre n8n : ${message}` })
      .eq('id', importRow.id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
