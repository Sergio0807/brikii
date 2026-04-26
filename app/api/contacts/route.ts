import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const contactSchema = z.object({
  personne_type: z.enum(['physique', 'morale']).default('physique'),
  civilite: z.enum(['monsieur', 'madame']).optional(),
  prenom: z.string().min(1).max(100).optional(),
  nom: z.string().max(100).optional(),
  raison_sociale: z.string().max(255).optional(),
  telephone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
}).refine(
  d => d.personne_type === 'morale' ? !!d.raison_sociale : !!(d.prenom || d.nom),
  { message: 'Nom ou prénom requis pour une personne physique ; raison sociale pour une personne morale' }
)

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10), 50)

  if (q.length < 2) return NextResponse.json([])

  const { data, error } = await supabase
    .from('contacts')
    .select('id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone')
    .eq('user_id', user.id)
    .eq('statut', 'actif')
    .is('deleted_at', null)
    .or(`prenom.ilike.%${q}%,nom.ilike.%${q}%,raison_sociale.ilike.%${q}%,email.ilike.%${q}%`)
    .order('nom', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({ ...parsed.data, user_id: user.id, origine: 'saisie_manuelle' })
    .select('id, personne_type, civilite, prenom, nom, raison_sociale, email, telephone')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(contact, { status: 201 })
}
