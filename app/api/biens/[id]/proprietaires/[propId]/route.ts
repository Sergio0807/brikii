import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const NATURE_DROIT = ['pleine_propriete', 'usufruit', 'nue_propriete', 'indivision'] as const

const patchSchema = z.object({
  nature_droit: z.enum(NATURE_DROIT).optional(),
  representant_contact_id: z.string().uuid().nullable().optional(),
  quote_part_numerateur: z.number().int().positive().nullable().optional(),
  quote_part_denominateur: z.number().int().positive().nullable().optional(),
  date_entree: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ordre: z.number().int().min(0).optional(),
})

type RouteContext = { params: Promise<{ id: string; propId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id: bienId, propId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: existing } = await supabase
    .from('bien_proprietaires')
    .select('id, bien_id')
    .eq('id', propId)
    .eq('bien_id', bienId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Ownership via RLS — no extra check needed, RLS will block unauthorized updates

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { error } = await supabase
    .from('bien_proprietaires')
    .update(parsed.data)
    .eq('id', propId)
    .eq('bien_id', bienId)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce contact possède déjà ce droit sur ce bien' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id: bienId, propId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: existing } = await supabase
    .from('bien_proprietaires')
    .select('id')
    .eq('id', propId)
    .eq('bien_id', bienId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { error } = await supabase
    .from('bien_proprietaires')
    .delete()
    .eq('id', propId)
    .eq('bien_id', bienId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
