import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const MANDAT_TYPES   = ['exclusif', 'simple', 'semi_exclusif', 'recherche', 'gestion'] as const
const STATUTS        = ['brouillon', 'import_en_cours', 'a_completer', 'pret_a_valider', 'actif'] as const
const STATUTS_METIER = ['expire', 'resilie', 'vendu', 'archive'] as const
const HONO_CHARGES   = ['vendeur', 'acquereur', 'partage'] as const

const patchSchema = z.object({
  bien_id:            z.string().uuid().nullable().optional(),
  numero_mandat:      z.string().nullable().optional(),
  type:               z.enum(MANDAT_TYPES).optional(),
  statut:             z.enum(STATUTS).optional(),
  statut_metier:      z.enum(STATUTS_METIER).nullable().optional(),
  date_signature:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_debut:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  duree_mois:         z.number().int().positive().nullable().optional(),
  reconductible:      z.boolean().optional(),
  prix_vente:         z.number().positive().optional(),
  prix_hono_inclus:   z.boolean().optional(),
  honoraires_charge:  z.enum(HONO_CHARGES).nullable().optional(),
  honoraires_pct:     z.number().min(0).max(100).nullable().optional(),
  honoraires_montant: z.number().positive().nullable().optional(),
  taux_retrocession:  z.number().min(0).max(100).nullable().optional(),
  clauses:            z.string().nullable().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('mandats')
    .select(`
      *,
      bien:biens(id, reference, type, ville, code_postal, prix, surface_hab),
      proprietaires:mandat_proprietaires(
        id, role, ordre,
        contact:contacts(id, prenom, nom, email, telephone)
      ),
      documents:mandat_documents(id, type, nom, url, taille, created_at)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: existing } = await supabase
    .from('mandats')
    .select('id, statut, bien_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updates = parsed.data

  // Enforce: statut actif ⇒ bien_id must be non-null (from update or existing)
  const finalBienId = 'bien_id' in updates ? updates.bien_id : existing.bien_id
  if (updates.statut === 'actif' && !finalBienId) {
    return NextResponse.json(
      { error: 'Un mandat actif doit être rattaché à un bien' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('mandats')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
