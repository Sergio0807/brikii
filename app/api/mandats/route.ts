import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const MANDAT_TYPES = ['exclusif', 'simple', 'semi_exclusif', 'recherche', 'gestion'] as const
const HONO_CHARGES = ['vendeur', 'acquereur', 'partage'] as const

const createSchema = z.object({
  bien_id:            z.string().uuid().optional(),
  numero_mandat:      z.string().nullable().optional(),
  type:               z.enum(MANDAT_TYPES),
  date_signature:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_debut:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duree_mois:         z.number().int().positive().optional(),
  reconductible:      z.boolean().optional(),
  prix_vente:         z.number().positive(),
  prix_hono_inclus:   z.boolean().optional(),
  honoraires_charge:  z.enum(HONO_CHARGES).optional(),
  honoraires_pct:     z.number().min(0).max(100).optional(),
  honoraires_montant: z.number().positive().optional(),
  taux_retrocession:  z.number().min(0).max(100).optional(),
  clauses:            z.string().optional(),
})

function generateNumero(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MAND-${date}-${rand}`
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bienId = searchParams.get('bien_id')

  let query = supabase
    .from('mandats')
    .select('id, numero, numero_mandat, type, statut, statut_metier, bien_id, date_signature, date_debut, date_fin, duree_mois, reconductible, prix_vente, honoraires_pct, honoraires_montant, honoraires_charge, created_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (bienId) query = query.eq('bien_id', bienId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  // Vérifier ownership du bien si fourni
  if (d.bien_id) {
    const { data: bien } = await supabase
      .from('biens')
      .select('id')
      .eq('id', d.bien_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!bien) {
      return NextResponse.json({ error: 'Bien introuvable ou non autorisé' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('mandats')
    .insert({
      user_id:            user.id,
      numero:             generateNumero(),
      numero_mandat:      d.numero_mandat ?? null,
      bien_id:            d.bien_id ?? null,
      type:               d.type,
      statut:             'brouillon',
      date_signature:     d.date_signature,
      date_debut:         d.date_debut,
      duree_mois:         d.duree_mois ?? null,
      reconductible:      d.reconductible ?? true,
      prix_vente:         d.prix_vente,
      prix_hono_inclus:   d.prix_hono_inclus ?? false,
      honoraires_charge:  d.honoraires_charge ?? null,
      honoraires_pct:     d.honoraires_pct ?? null,
      honoraires_montant: d.honoraires_montant ?? null,
      taux_retrocession:  d.taux_retrocession ?? null,
      clauses:            d.clauses ?? null,
    })
    .select('id, numero')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id, numero: data.numero }, { status: 201 })
}
