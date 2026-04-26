import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ROLES = ['proprietaire_principal', 'coproprietaire', 'mandataire_legal', 'representant_sci'] as const
const NATURE_DROIT = ['pleine_propriete', 'usufruit', 'nue_propriete', 'indivision'] as const

const insertSchema = z.object({
  contact_id: z.string().uuid(),
  role: z.enum(ROLES).default('proprietaire_principal'),
  nature_droit: z.enum(NATURE_DROIT).default('pleine_propriete'),
  representant_contact_id: z.string().uuid().nullable().optional(),
  quote_part_numerateur: z.number().int().positive().nullable().optional(),
  quote_part_denominateur: z.number().int().positive().nullable().optional(),
  ordre: z.number().int().min(0).default(0),
  source_bien_proprietaire_id: z.string().uuid().nullable().optional(),
}).refine(
  d => (d.quote_part_numerateur == null) === (d.quote_part_denominateur == null),
  { message: 'Les deux champs quote_part doivent être renseignés ensemble ou aucun' }
)

type RouteContext = { params: Promise<{ id: string }> }

async function verifyMandatOwnership(supabase: Awaited<ReturnType<typeof createClient>>, mandatId: string, userId: string) {
  const { data } = await supabase
    .from('mandats')
    .select('id, bien_id')
    .eq('id', mandatId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()
  return data
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: mandatId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (!await verifyMandatOwnership(supabase, mandatId, user.id)) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('mandat_proprietaires')
    .select(`
      id, role, ordre, nature_droit, quote_part_numerateur, quote_part_denominateur, source_bien_proprietaire_id,
      contact:contacts(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone),
      representant:contacts!representant_contact_id(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone)
    `)
    .eq('mandat_id', mandatId)
    .order('ordre', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: mandatId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (!await verifyMandatOwnership(supabase, mandatId, user.id)) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  // Special action: import from bien_proprietaires
  const bodyObj = body as Record<string, unknown>
  if (bodyObj?.action === 'import_from_bien') {
    return handleImportFromBien(supabase, mandatId, user.id)
  }

  const parsed = insertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('mandat_proprietaires')
    .insert({ ...parsed.data, mandat_id: mandatId })
    .select(`
      id, role, ordre, nature_droit, quote_part_numerateur, quote_part_denominateur, source_bien_proprietaire_id,
      contact:contacts(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone),
      representant:contacts!representant_contact_id(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone)
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce contact possède déjà ce rôle sur ce mandat' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

async function handleImportFromBien(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mandatId: string,
  userId: string
) {
  // Fetch the mandat's bien_id
  const { data: mandat } = await supabase
    .from('mandats')
    .select('bien_id')
    .eq('id', mandatId)
    .eq('user_id', userId)
    .single()

  if (!mandat?.bien_id) {
    return NextResponse.json({ error: 'Ce mandat n\'est pas rattaché à un bien' }, { status: 400 })
  }

  // Fetch bien_proprietaires
  const { data: bienProps, error: bpError } = await supabase
    .from('bien_proprietaires')
    .select('id, contact_id, nature_droit, representant_contact_id, quote_part_numerateur, quote_part_denominateur, ordre')
    .eq('bien_id', mandat.bien_id)
    .order('ordre', { ascending: true })

  if (bpError) return NextResponse.json({ error: bpError.message }, { status: 500 })
  if (!bienProps || bienProps.length === 0) {
    return NextResponse.json({ error: 'Aucun propriétaire enregistré sur ce bien' }, { status: 400 })
  }

  // Map to mandat_proprietaires rows
  const rows = bienProps.map((bp, i) => ({
    mandat_id: mandatId,
    contact_id: bp.contact_id,
    role: i === 0 ? 'proprietaire_principal' : 'coproprietaire',
    nature_droit: bp.nature_droit,
    representant_contact_id: bp.representant_contact_id ?? null,
    quote_part_numerateur: bp.quote_part_numerateur ?? null,
    quote_part_denominateur: bp.quote_part_denominateur ?? null,
    ordre: bp.ordre,
    source_bien_proprietaire_id: bp.id,
  }))

  const { error: insertError } = await supabase
    .from('mandat_proprietaires')
    .upsert(rows, { onConflict: 'mandat_id,contact_id,nature_droit', ignoreDuplicates: true })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Return updated list
  const { data: updated, error: fetchError } = await supabase
    .from('mandat_proprietaires')
    .select(`
      id, role, ordre, nature_droit, quote_part_numerateur, quote_part_denominateur, source_bien_proprietaire_id,
      contact:contacts(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone),
      representant:contacts!representant_contact_id(id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone)
    `)
    .eq('mandat_id', mandatId)
    .order('ordre', { ascending: true })

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json(updated)
}
