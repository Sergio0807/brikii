import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { lookupSiret, isNafImmobilier } from '@/lib/sirene/lookup'
import { rateLimit, getIp } from '@/lib/rate-limit'

const BodySchema = z.object({
  siret: z.string().regex(/^\d{14}$/, 'SIRET doit contenir 14 chiffres'),
})

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (!rateLimit(`agences-verify:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const agence = await lookupSiret(parsed.data.siret)
  if (!agence) {
    return NextResponse.json({ valid: false, reason: 'siret_inconnu' }, { status: 404 })
  }

  if (!isNafImmobilier(agence.codeNaf)) {
    return NextResponse.json({ valid: false, reason: 'activite_non_immobiliere', data: agence })
  }

  return NextResponse.json({ valid: true, data: agence })
}
