import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error || !contact) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const [rolesRes, biensRes, interactionsRes] = await Promise.all([
    supabase
      .from('contact_roles')
      .select('type, actif')
      .eq('contact_id', id)
      .order('actif', { ascending: false }),

    supabase
      .from('contact_biens')
      .select('id, role, bien:biens(id, reference, type, ville, statut)')
      .eq('contact_id', id),

    supabase
      .from('contact_interactions')
      .select('id, type, titre, contenu, date_inter, created_at')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    ...contact,
    roles:        rolesRes.data ?? [],
    biens:        biensRes.data ?? [],
    interactions: interactionsRes.data ?? [],
  })
}
