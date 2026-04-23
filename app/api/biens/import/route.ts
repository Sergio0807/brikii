import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const importSchema = z.object({
  source_url: z.string().url(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { source_url } = parsed.data

  const { data: importRecord, error: insertError } = await supabase
    .from('bien_imports')
    .insert({ user_id: user.id, source_url, status: 'pending' })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    await supabase.from('bien_imports').update({
      status: 'error',
      error_message: 'Service d\'import non configuré',
    }).eq('id', importRecord.id)
    return NextResponse.json({ error: 'Service d\'import non configuré' }, { status: 502 })
  }

  try {
    const res = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: source_url, import_id: importRecord.id, user_id: user.id }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) throw new Error(`n8n responded ${res.status}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[import] échec appel n8n:', n8nUrl, msg)
    await supabase.from('bien_imports').update({
      status: 'error',
      error_message: 'Impossible de contacter le service d\'import',
    }).eq('id', importRecord.id)
    return NextResponse.json({ error: 'Impossible de contacter le service d\'import', detail: msg }, { status: 502 })
  }

  await supabase.from('bien_imports').update({ status: 'scraping' }).eq('id', importRecord.id)

  return NextResponse.json({ import_id: importRecord.id }, { status: 202 })
}
