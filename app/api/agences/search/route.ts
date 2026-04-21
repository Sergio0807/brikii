import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchAgences } from '@/lib/sirene/lookup'
import { rateLimit, getIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const ip = getIp(request)
  if (!rateLimit(`agences-search:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = await createClient()

  const { data: local } = await supabase
    .from('agences')
    .select('id, nom, ville, siret, logo_url, source, type')
    .or(`nom.ilike.%${q}%,ville.ilike.%${q}%,siret.ilike.%${q}%`)
    .eq('statut', 'active')
    .is('deleted_at', null)
    .limit(10)

  const localResults = (local ?? []).map(a => ({ ...a, source: a.source ?? 'brikii' }))

  let combined = localResults
  if (localResults.length < 3) {
    const sireneResults = await searchAgences(q)
    const sireneIds = new Set(localResults.map(r => r.siret).filter(Boolean))
    const newFromSirene = sireneResults.filter(r => !sireneIds.has(r.siret))
    const sireneNormalized = newFromSirene.map(s => ({
      id:       undefined as string | undefined,
      nom:      s.nom,
      ville:    s.ville,
      siret:    s.siret,
      logo_url: null as string | null,
      type:     null as string | null,
      source:   'sirene' as string,
    }))
    combined = [...localResults, ...sireneNormalized].slice(0, 10)
  }

  return NextResponse.json({ results: combined })
}
