import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { format } from 'date-fns'

// ── Zod schema ────────────────────────────────────────────────

const photoSchema = z.object({
  cloudflare_image_id: z.string(),
  url: z.string().url(),
  ordre: z.number().int().nonnegative(),
})

const payloadSchema = z.object({
  import_id: z.string().uuid(),
  source: z.object({
    url: z.string().url(),
    portail: z.string().optional(),
  }),
  bien: z.object({
    type: z.enum(['maison', 'appartement', 'terrain', 'immeuble', 'commerce', 'local', 'autre']),
    adresse: z.string().min(1),
    ville: z.string().min(1),
    code_postal: z.string().min(1),
    prix: z.number().int().positive(),
    surface_hab: z.number().positive().optional(),
    descriptif: z.string().optional(),
  }),
  details_type: z.record(z.unknown()).optional(),
  photos: z.array(photoSchema).optional(),
})

// ── Reference generator ───────────────────────────────────────

function generateReference(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `BIEN-${date}-${rand}`
}

// ── Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 5.4 — check N8N_WEBHOOK_SECRET is configured
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook/n8n/biens] N8N_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
  }

  // 5.3 — check signature header presence and format
  const sigHeader = req.headers.get('x-brikii-signature')
  if (!sigHeader || !sigHeader.startsWith('sha256=')) {
    return NextResponse.json({ error: 'Signature manquante ou mal formée' }, { status: 401 })
  }
  const receivedHex = sigHeader.slice(7)

  // 5.2 — read raw body for HMAC verification
  const rawBody = await req.arrayBuffer()
  const rawBuffer = Buffer.from(rawBody)

  // 5.4 — compute expected HMAC and compare with timing-safe equal
  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(rawBuffer)
    .digest('hex')

  const expectedBuf = Buffer.from(expectedHex)
  const receivedBuf = Buffer.from(receivedHex)

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return NextResponse.json({ error: 'Signature incorrecte' }, { status: 401 })
  }

  // 5.5 — parse and validate JSON payload
  let rawJson: unknown
  try { rawJson = JSON.parse(rawBuffer.toString('utf-8')) } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(rawJson)
  if (!parsed.success) {
    const supabase = await createClient()
    const maybeImportId = (rawJson as Record<string, unknown>)?.import_id as string | undefined
    if (maybeImportId) {
      await supabase.from('bien_imports').update({
        status: 'error',
        error_message: 'Payload invalide : ' + JSON.stringify(parsed.error.flatten()),
      }).eq('id', maybeImportId)
    }
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { import_id, source, bien, details_type, photos } = parsed.data
  const supabase = await createClient()

  // 5.6 — verify import_id exists; update to mapping
  const { data: importRow, error: importLookupError } = await supabase
    .from('bien_imports')
    .select('id, user_id')
    .eq('id', import_id)
    .single()

  if (importLookupError || !importRow) {
    return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
  }

  await supabase.from('bien_imports').update({ status: 'mapping' }).eq('id', import_id)

  try {
    // 5.7 — insert bien with a_verifier = true
    const reference = generateReference()
    const { data: bienRow, error: bienError } = await supabase
      .from('biens')
      .insert({
        user_id: importRow.user_id,
        reference,
        type: bien.type,
        adresse: bien.adresse,
        ville: bien.ville,
        code_postal: bien.code_postal,
        prix: bien.prix,
        surface_hab: bien.surface_hab ?? null,
        descriptif: bien.descriptif ?? null,
        source_url: source.url,
        source_portail: source.portail ?? null,
        a_verifier: true,
      })
      .select('id')
      .single()

    if (bienError) throw new Error(bienError.message)

    // 5.8 — insert into sub-table for maison/appartement
    if (details_type && (bien.type === 'maison' || bien.type === 'appartement')) {
      const table = bien.type === 'maison' ? 'biens_maisons' : 'biens_appartements'
      await supabase.from(table).insert({ bien_id: bienRow.id, ...details_type })
    }

    // 5.9 — insert photos
    if (photos && photos.length > 0) {
      await supabase.from('bien_photos').insert(
        photos.map(p => ({ bien_id: bienRow.id, ...p }))
      )
    }

    // 5.10 — store raw payload; 5.11 — update to completed
    await supabase.from('bien_imports').update({
      status: 'completed',
      bien_id: bienRow.id,
      n8n_payload: rawJson as object,
    }).eq('id', import_id)

    return NextResponse.json({ ok: true })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    await supabase.from('bien_imports').update({
      status: 'error',
      error_message: message,
    }).eq('id', import_id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
