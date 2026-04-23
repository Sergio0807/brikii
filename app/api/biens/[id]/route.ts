import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const BIEN_TYPES = ['maison', 'appartement', 'terrain', 'immeuble', 'commerce', 'local', 'autre'] as const
const STATUTS = ['brouillon', 'sur_le_marche', 'sous_offre', 'vendu', 'archive'] as const

const SOUS_TABLE: Partial<Record<string, string>> = {
  maison: 'biens_maisons',
  appartement: 'biens_appartements',
  terrain: 'biens_terrains',
  immeuble: 'biens_immeubles',
  commerce: 'biens_commerces',
}

const patchSchema = z.object({
  type: z.enum(BIEN_TYPES).optional(),
  statut: z.enum(STATUTS).optional(),
  adresse: z.string().min(1).optional(),
  ville: z.string().min(1).optional(),
  code_postal: z.string().min(1).optional(),
  prix: z.number().int().positive().nullable().optional(),
  surface_hab: z.number().positive().nullable().optional(),
  surface_terrain: z.number().positive().nullable().optional(),
  descriptif: z.string().nullable().optional(),
  a_verifier: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: bien, error } = await supabase
    .from('biens')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error || !bien) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const sousTable = SOUS_TABLE[bien.type]
  let details: Record<string, unknown> | null = null
  if (sousTable) {
    const { data } = await supabase
      .from(sousTable)
      .select('*')
      .eq('bien_id', id)
      .maybeSingle()
    details = data
  }

  const { data: photos } = await supabase
    .from('bien_photos')
    .select('id, cloudflare_image_id, url, ordre')
    .eq('bien_id', id)
    .order('ordre', { ascending: true })

  return NextResponse.json({ ...bien, details, photos: photos ?? [] })
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { details, ...bienFields } = parsed.data

  // Verify ownership
  const { data: existing } = await supabase
    .from('biens')
    .select('id, type')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  if (Object.keys(bienFields).length > 0) {
    const { error: updateError } = await supabase
      .from('biens')
      .update(bienFields)
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (details) {
    const effectiveType = (bienFields.type ?? existing.type) as string
    const sousTable = SOUS_TABLE[effectiveType]
    if (sousTable) {
      const { error: detailsError } = await supabase
        .from(sousTable)
        .upsert({ bien_id: id, ...details }, { onConflict: 'bien_id' })

      if (detailsError) return NextResponse.json({ error: detailsError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
