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
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 }) }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { source_url } = parsed.data

  // Créer l'enregistrement d'import
  const { data: importRow, error: insertErr } = await supabase
    .from('mandat_imports')
    .insert({ user_id: user.id, source_url, status: 'pending' })
    .select('id')
    .single()

  if (insertErr || !importRow) {
    return NextResponse.json({ error: 'Erreur création import' }, { status: 500 })
  }

  const webhookUrl = process.env.N8N_MANDAT_WEBHOOK_URL
  if (!webhookUrl) {
    await supabase
      .from('mandat_imports')
      .update({ status: 'error', error_message: 'N8N_MANDAT_WEBHOOK_URL non configuré' })
      .eq('id', importRow.id)
    return NextResponse.json({ error: 'Import n8n non configuré' }, { status: 502 })
  }

  // Appel n8n — fire and no-wait
  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: source_url, import_id: importRow.id, user_id: user.id }),
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
