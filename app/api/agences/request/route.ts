import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIp } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

const BodySchema = z.object({
  siret:         z.string().regex(/^\d{14}$/),
  nom:           z.string().min(2).max(200),
  ville:         z.string().max(100).optional(),
  contact_email: z.string().email(),
  contact_nom:   z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (!rateLimit(`agences-request:${ip}`, 5, 60_000)) {
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Vérif doublon SIRET + pending
  const { data: existing } = await supabase
    .from('agences_demandes')
    .select('id')
    .eq('siret', parsed.data.siret)
    .eq('statut', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'demande_existante', id: existing.id }, { status: 409 })
  }

  const { data: demande, error } = await supabase
    .from('agences_demandes')
    .insert({
      siret:         parsed.data.siret,
      nom:           parsed.data.nom,
      ville:         parsed.data.ville ?? null,
      contact_email: parsed.data.contact_email,
      contact_nom:   parsed.data.contact_nom ?? null,
      demande_par:   user?.id ?? null,
      statut:        'pending',
    })
    .select('id')
    .single()

  if (error || !demande) {
    return NextResponse.json({ error: 'Erreur lors de la création de la demande' }, { status: 500 })
  }

  // Notification admin
  const adminEmail = process.env.RESEND_FROM_EMAIL ?? 'admin@brikii.fr'
  await resend.emails.send({
    from: `Brikii <${process.env.RESEND_FROM_EMAIL ?? 'noreply@brikii.fr'}>`,
    to:   adminEmail,
    subject: `[Brikii] Nouvelle demande d'agence : ${parsed.data.nom}`,
    text: [
      `Nouvelle demande de création d'agence`,
      ``,
      `Nom      : ${parsed.data.nom}`,
      `SIRET    : ${parsed.data.siret}`,
      `Ville    : ${parsed.data.ville ?? '—'}`,
      `Contact  : ${parsed.data.contact_nom ?? '—'} <${parsed.data.contact_email}>`,
      `Demandeur: ${user?.email ?? 'non connecté'}`,
      ``,
      `ID demande : ${demande.id}`,
    ].join('\n'),
  }).catch(() => { /* non bloquant */ })

  return NextResponse.json({ success: true, id: demande.id })
}
