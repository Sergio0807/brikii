import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ROLES = ['proprietaire_principal', 'coproprietaire', 'mandataire_legal', 'representant_sci'] as const
const NATURE_DROIT = ['pleine_propriete', 'usufruit', 'nue_propriete', 'indivision'] as const

const patchSchema = z.object({
  role: z.enum(ROLES).optional(),
  nature_droit: z.enum(NATURE_DROIT).optional(),
  representant_contact_id: z.string().uuid().nullable().optional(),
  quote_part_numerateur: z.number().int().positive().nullable().optional(),
  quote_part_denominateur: z.number().int().positive().nullable().optional(),
  ordre: z.number().int().min(0).optional(),
})

type RouteContext = { params: Promise<{ id: string; propId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id: mandatId, propId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: existing } = await supabase
    .from('mandat_proprietaires')
    .select('id, mandat_id')
    .eq('id', propId)
    .eq('mandat_id', mandatId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { error } = await supabase
    .from('mandat_proprietaires')
    .update(parsed.data)
    .eq('id', propId)
    .eq('mandat_id', mandatId)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce contact possède déjà ce rôle sur ce mandat' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id: mandatId, propId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: existing } = await supabase
    .from('mandat_proprietaires')
    .select('id')
    .eq('id', propId)
    .eq('mandat_id', mandatId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { error } = await supabase
    .from('mandat_proprietaires')
    .delete()
    .eq('id', propId)
    .eq('mandat_id', mandatId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
