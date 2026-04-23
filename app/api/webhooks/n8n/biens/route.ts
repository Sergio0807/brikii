import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

// ── Schemas ───────────────────────────────────────────────────────────────────

const photoSchema = z.object({
  ordre:      z.number().int().nonnegative(),
  url:        z.string().url(),
  source_key: z.string().optional(),
  source_url: z.string().optional(),
})

const payloadSchema = z.object({
  import_id:     z.string().uuid(),
  user_id:       z.string().uuid().optional(),
  source: z.object({
    portail: z.string().optional(),
    url:     z.string().url(),
  }),
  reference:     z.string().optional(),
  type:          z.enum(['maison', 'appartement', 'terrain', 'immeuble', 'commerce', 'local', 'autre']),
  prix:          z.number().int().positive().optional(),
  ville:         z.string().optional(),
  code_postal:   z.string().nullable().optional(),
  descriptif:    z.string().optional(),
  photos:        z.array(photoSchema).optional(),
  photos_count:  z.number().int().nonnegative().optional(),
  attributes:    z.record(z.string(), z.unknown()).optional(),
  import_status: z.string().optional(),
})

type Attrs = NonNullable<z.infer<typeof payloadSchema>['attributes']>

// ── Attributes mapping ────────────────────────────────────────────────────────

const DPE_VALID = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'])

function safeNum(v: unknown): number | null {
  return typeof v === 'number' && isFinite(v) ? v : null
}
function posNum(v: unknown): number | null {
  const n = safeNum(v)
  return n !== null && n > 0 ? n : null
}
function safeDpe(v: unknown): string | null {
  return typeof v === 'string' && DPE_VALID.has(v) ? v : null
}

// Fields extracted at root bien level — not going into sub-table
const ROOT_ATTRS = new Set(['surface_habitable', 'surface_terrain'])

// Fields explicitly mapped to sub-table columns
const MAPPED_ATTRS = new Set([
  'pieces', 'chambres', 'salle_de_bain', 'salle_d_eau', 'wc',
  'dpe_energy_class', 'dpe_energy_value', 'ges_class', 'ges_value',
])

function mapToSubTable(attrs: Attrs): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  const nb_pieces   = safeNum(attrs.pieces)
  const nb_chambres = safeNum(attrs.chambres)
  const nb_sdb      = safeNum(attrs.salle_de_bain)
  const nb_sde      = safeNum(attrs.salle_d_eau)
  const nb_wc       = safeNum(attrs.wc)
  const dpe_lettre  = safeDpe(attrs.dpe_energy_class)
  const dpe_valeur  = posNum(attrs.dpe_energy_value)
  const ges_lettre  = safeDpe(attrs.ges_class)
  const ges_valeur  = posNum(attrs.ges_value)

  if (nb_pieces   !== null) result.nb_pieces   = nb_pieces
  if (nb_chambres !== null) result.nb_chambres = nb_chambres
  if (nb_sdb      !== null) result.nb_sdb      = nb_sdb
  if (nb_sde      !== null) result.nb_sde      = nb_sde
  if (nb_wc       !== null) result.nb_wc       = nb_wc
  if (dpe_lettre)           result.dpe_lettre  = dpe_lettre
  if (dpe_valeur  !== null) result.dpe_valeur  = dpe_valeur
  if (ges_lettre)           result.ges_lettre  = ges_lettre
  if (ges_valeur  !== null) result.ges_valeur  = ges_valeur

  // Everything not mapped goes into metadata (frais_agence, objet, date, etc.)
  const extra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(attrs)) {
    if (!ROOT_ATTRS.has(k) && !MAPPED_ATTRS.has(k)) extra[k] = v
  }
  if (Object.keys(extra).length > 0) result.metadata = extra

  return result
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/n8n/biens] N8N_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
  }

  // Signature HMAC
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

  // Validate
  const parsed = payloadSchema.safeParse(rawJson)
  if (!parsed.success) {
    console.error('[webhook/n8n/biens] Payload invalide:', parsed.error.flatten())
    const maybeId = (rawJson as Record<string, unknown>)?.import_id as string | undefined
    if (maybeId) {
      const supabase = await createClient()
      await supabase.from('bien_imports').update({
        status: 'error',
        error_message: 'Payload invalide : ' + JSON.stringify(parsed.error.flatten()),
      }).eq('id', maybeId)
    }
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data

  // Si n8n signale lui-même une erreur de scraping
  if (data.import_status && data.import_status !== 'success') {
    const supabase = await createClient()
    await supabase.from('bien_imports').update({
      status: 'error',
      error_message: `Échec workflow n8n : import_status=${data.import_status}`,
    }).eq('id', data.import_id)
    return NextResponse.json({ error: 'Import n8n en échec' }, { status: 422 })
  }

  const supabase = await createClient()

  // Vérifier que l'import existe
  const { data: importRow, error: importErr } = await supabase
    .from('bien_imports')
    .select('id, user_id')
    .eq('id', data.import_id)
    .single()

  if (importErr || !importRow) {
    return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
  }

  await supabase
    .from('bien_imports')
    .update({ status: 'mapping' })
    .eq('id', data.import_id)

  const attrs        = data.attributes ?? {}
  const surface_hab  = safeNum(attrs.surface_habitable)
  const surface_terr = safeNum(attrs.surface_terrain)

  try {
    // Créer le bien
    const { data: bienRow, error: bienErr } = await supabase
      .from('biens')
      .insert({
        user_id:        importRow.user_id,
        reference:      data.reference ?? null,
        type:           data.type,
        prix:           data.prix ?? null,
        ville:          data.ville ?? null,
        code_postal:    data.code_postal ?? null,
        descriptif:     data.descriptif ?? null,
        surface_hab:    surface_hab,
        surface_terrain: surface_terr,
        source_url:     data.source.url,
        source_portail: data.source.portail ?? null,
        a_verifier:     true,
      })
      .select('id')
      .single()

    if (bienErr) throw new Error(bienErr.message)

    // Sous-table maison / appartement
    if (data.type === 'maison' || data.type === 'appartement') {
      const table   = data.type === 'maison' ? 'biens_maisons' : 'biens_appartements'
      const subData = mapToSubTable(attrs)
      if (Object.keys(subData).length > 0) {
        const { error: subErr } = await supabase
          .from(table)
          .insert({ bien_id: bienRow.id, ...subData })
        if (subErr) {
          // Non-fatal : le bien est créé, les détails seront ajoutables manuellement
          console.error(`[webhook/n8n/biens] Sous-table ${table}:`, subErr.message)
        }
      }
    }

    // Photos
    // source_key sert de clé de stockage (R2) — stocké dans cloudflare_image_id
    // pour compatibilité temporaire avec le schéma actuel (à renommer à terme)
    if (data.photos && data.photos.length > 0) {
      const { error: photoErr } = await supabase
        .from('bien_photos')
        .insert(
          data.photos.map(p => ({
            bien_id:             bienRow.id,
            cloudflare_image_id: p.source_key ?? p.url,
            url:                 p.url,
            ordre:               p.ordre,
          }))
        )
      if (photoErr) {
        console.error('[webhook/n8n/biens] Photos:', photoErr.message)
      }
    }

    // Marquer l'import comme terminé
    await supabase
      .from('bien_imports')
      .update({
        status:      'completed',
        bien_id:     bienRow.id,
        n8n_payload: rawJson as object,
      })
      .eq('id', data.import_id)

    console.log(
      `[webhook/n8n/biens] Import ${data.import_id} → bien ${bienRow.id}` +
      ` (${data.type}, ref: ${data.reference ?? '—'}, portail: ${data.source.portail ?? '—'})`
    )

    return NextResponse.json({ ok: true, bien_id: bienRow.id })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[webhook/n8n/biens] Création bien:', message)
    await supabase
      .from('bien_imports')
      .update({ status: 'error', error_message: message })
      .eq('id', data.import_id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
