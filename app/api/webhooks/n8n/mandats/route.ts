import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

// ── Schemas ───────────────────────────────────────────────────────────────────

const payloadSchema = z.object({
  import_id:     z.string().uuid(),
  import_status: z.string().optional(),
  source: z.object({
    url:     z.string().url(),
    portail: z.string().optional(),
  }).optional(),

  // Champs mandat extraits du PDF
  type:              z.enum(['exclusif', 'simple', 'semi_exclusif', 'recherche', 'gestion']).optional(),
  numero:            z.string().optional(),
  date_signature:    z.string().optional(),
  date_debut:        z.string().optional(),
  duree_mois:        z.number().int().positive().optional(),
  reconductible:     z.boolean().optional(),
  prix_vente:        z.number().positive().optional(),
  honoraires_pct:    z.number().optional(),
  honoraires_charge: z.enum(['vendeur', 'acquereur', 'partage']).optional(),
  honoraires_montant: z.number().optional(),
  taux_retrocession: z.number().optional(),
  clauses:           z.string().optional(),

  // Infos bien extraites
  bien: z.object({
    ville:       z.string().optional(),
    code_postal: z.string().optional(),
    type:        z.string().optional(),
    surface_hab: z.number().optional(),
  }).optional(),

  // Documents PDF uploadés
  documents: z.array(z.object({
    url:  z.string().url(),
    nom:  z.string().optional(),
    type: z.string().optional(),
  })).optional(),
})

function generateNumero(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MAND-${date}-${rand}`
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = process.env.N8N_MANDAT_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/n8n/mandats] N8N_MANDAT_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
  }

  // Vérification HMAC
  const sigHeader = req.headers.get('x-brikii-signature')
  if (!sigHeader || !sigHeader.startsWith('sha256=')) {
    return NextResponse.json({ error: 'Signature manquante ou mal formée' }, { status: 401 })
  }

  const rawBody   = await req.arrayBuffer()
  const rawBuffer = Buffer.from(rawBody)

  const expectedHex = crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex')
  const expectedBuf = Buffer.from(expectedHex)
  const receivedBuf = Buffer.from(sigHeader.slice(7))

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return NextResponse.json({ error: 'Signature incorrecte' }, { status: 401 })
  }

  // Parse JSON
  let rawJson: unknown
  try {
    rawJson = JSON.parse(rawBuffer.toString('utf-8'))
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  // Validation Zod
  const parsed = payloadSchema.safeParse(rawJson)
  if (!parsed.success) {
    console.error('[webhook/n8n/mandats] Payload invalide:', parsed.error.flatten())
    const maybeId = (rawJson as Record<string, unknown>)?.import_id as string | undefined
    if (maybeId) {
      const supabase = createAdminClient()
      await supabase.from('mandat_imports').update({
        status: 'error',
        error_message: 'Payload invalide : ' + JSON.stringify(parsed.error.flatten()),
      }).eq('id', maybeId)
    }
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data

  // Échec signalé par n8n
  if (data.import_status && data.import_status !== 'success') {
    const supabase = createAdminClient()
    await supabase.from('mandat_imports').update({
      status: 'error',
      error_message: `Échec workflow n8n : import_status=${data.import_status}`,
    }).eq('id', data.import_id)
    return NextResponse.json({ error: 'Import n8n en échec' }, { status: 422 })
  }

  const supabase = createAdminClient()

  // Vérifier que l'import existe
  const { data: importRow, error: importErr } = await supabase
    .from('mandat_imports')
    .select('id, user_id')
    .eq('id', data.import_id)
    .single()

  if (importErr || !importRow) {
    return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
  }

  try {
    // Créer le mandat
    const { data: mandatRow, error: mandatErr } = await supabase
      .from('mandats')
      .insert({
        user_id:            importRow.user_id,
        numero:             data.numero ?? generateNumero(),
        statut:             'a_completer',
        type:               data.type ?? 'exclusif',
        date_signature:     data.date_signature ?? new Date().toISOString().slice(0, 10),
        date_debut:         data.date_debut ?? new Date().toISOString().slice(0, 10),
        duree_mois:         data.duree_mois ?? null,
        reconductible:      data.reconductible ?? true,
        prix_vente:         data.prix_vente ?? 0,
        honoraires_pct:     data.honoraires_pct ?? null,
        honoraires_charge:  data.honoraires_charge ?? null,
        honoraires_montant: data.honoraires_montant ?? null,
        taux_retrocession:  data.taux_retrocession ?? null,
        clauses:            data.clauses ?? null,
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (mandatErr) throw new Error(mandatErr.message)

    // Insérer les documents si présents (non fatal)
    if (data.documents && data.documents.length > 0) {
      const { error: docErr } = await supabase
        .from('mandat_documents')
        .insert(
          data.documents.map(doc => ({
            mandat_id: mandatRow.id,
            user_id:   importRow.user_id,
            type:      doc.type ?? 'mandat_pdf',
            nom:       doc.nom ?? 'Document importé',
            url:       doc.url,
          }))
        )
      if (docErr) {
        console.error('[webhook/n8n/mandats] Documents:', docErr.message)
      }
    }

    // Marquer l'import comme terminé
    await supabase
      .from('mandat_imports')
      .update({
        status:      'completed',
        mandat_id:   mandatRow.id,
        n8n_payload: rawJson as object,
      })
      .eq('id', data.import_id)

    console.log(`[webhook/n8n/mandats] Import ${data.import_id} → mandat ${mandatRow.id}`)

    return NextResponse.json({ ok: true, mandat_id: mandatRow.id })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[webhook/n8n/mandats] Création mandat:', message)
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: message })
      .eq('id', data.import_id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
