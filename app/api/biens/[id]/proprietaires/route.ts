import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const NATURE_DROIT = ['pleine_propriete', 'usufruit', 'nue_propriete', 'indivision'] as const

const insertSchema = z.object({
  contact_id: z.string().uuid(),
  nature_droit: z.enum(NATURE_DROIT).default('pleine_propriete'),
  representant_contact_id: z.string().uuid().nullable().optional(),
  quote_part_numerateur: z.number().int().positive().nullable().optional(),
  quote_part_denominateur: z.number().int().positive().nullable().optional(),
  date_entree: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ordre: z.number().int().min(0).default(0),
}).refine(
  d => (d.quote_part_numerateur == null) === (d.quote_part_denominateur == null),
  { message: 'Les deux champs quote_part doivent être renseignés ensemble ou aucun' }
)

type RouteContext = { params: Promise<{ id: string }> }

async function verifyBienOwnership(supabase: Awaited<ReturnType<typeof createClient>>, bienId: string, userId: string) {
  const { data } = await supabase
    .from('biens')
    .select('id')
    .eq('id', bienId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()
  return !!data
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: bienId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (!await verifyBienOwnership(supabase, bienId, user.id)) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('bien_proprietaires')
    .select(`
      id, nature_droit, quote_part_numerateur, quote_part_denominateur, date_entree, ordre, created_at,
      contact:contacts(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone),
      representant:contacts!representant_contact_id(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone)
    `)
    .eq('bien_id', bienId)
    .order('ordre', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: bienId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (!await verifyBienOwnership(supabase, bienId, user.id)) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = insertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bien_proprietaires')
    .insert({ ...parsed.data, bien_id: bienId })
    .select(`
      id, nature_droit, quote_part_numerateur, quote_part_denominateur, date_entree, ordre, created_at,
      contact:contacts(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone),
      representant:contacts!representant_contact_id(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone)
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce contact possède déjà ce droit sur ce bien' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
