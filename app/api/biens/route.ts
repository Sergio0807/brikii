import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { format } from 'date-fns'

const BIEN_TYPES = ['maison', 'appartement', 'terrain', 'immeuble', 'commerce', 'local', 'autre'] as const

const bienSchema = z.object({
  type: z.enum(BIEN_TYPES),
  adresse: z.string().min(1),
  ville: z.string().min(1),
  code_postal: z.string().min(1),
  prix: z.number().int().positive(),
  surface_hab: z.number().positive().optional(),
  descriptif: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

function generateReference(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `BIEN-${date}-${rand}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('biens')
    .select('id, reference, type, adresse, ville, code_postal, prix, statut, a_verifier, created_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 20, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = bienSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { type, adresse, ville, code_postal, prix, surface_hab, descriptif, details } = parsed.data
  const reference = generateReference()

  const { data: bien, error: bienError } = await supabase
    .from('biens')
    .insert({
      user_id: user.id,
      reference,
      type,
      adresse,
      ville,
      code_postal,
      prix,
      surface_hab: surface_hab ?? null,
      descriptif: descriptif ?? null,
      a_verifier: false,
    })
    .select('id, reference')
    .single()

  if (bienError) return NextResponse.json({ error: bienError.message }, { status: 500 })

  if (details && (type === 'maison' || type === 'appartement')) {
    const table = type === 'maison' ? 'biens_maisons' : 'biens_appartements'
    await supabase.from(table).insert({ bien_id: bien.id, ...details })
  }

  return NextResponse.json({ id: bien.id, reference: bien.reference }, { status: 201 })
}
