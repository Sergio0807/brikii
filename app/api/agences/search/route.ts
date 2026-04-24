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

  const { data: local, error: localError } = await supabase
    .from('agences')
    .select('id, nom, ville, type, adresse')
    .ilike('nom', `%${q}%`)
    .limit(10)

  console.log('[agences/search] q=', q, 'results=', local?.length, 'error=', localError?.message)

  const localResults = (local ?? []).map(a => ({
    id:       a.id,
    nom:      a.nom,
    ville:    a.ville ?? null,
    type:     a.type ?? null,
    siret:    null as string | null,
    logo_url: null as string | null,
    source:   'brikii',
  }))

  let combined = localResults
  if (localResults.length < 3) {
    const sireneResults = await searchAgences(q)
    const localNoms = new Set(localResults.map(r => r.nom.toLowerCase()))
    const newFromSirene = sireneResults.filter(r => !localNoms.has(r.nom.toLowerCase()))
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
