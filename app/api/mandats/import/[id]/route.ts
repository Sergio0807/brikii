import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('mandat_imports')
    .select('status, mandat_id, error_message, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })

  return NextResponse.json({
    status:        data.status,
    mandat_id:     data.mandat_id,
    error_message: data.error_message,
    created_at:    data.created_at,
  })
}
