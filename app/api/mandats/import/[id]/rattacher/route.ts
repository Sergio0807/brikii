import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  bien_id: z.string().uuid(),
})

function generateNumero(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MAND-${date}-${rand}`
}

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: importId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { bien_id } = parsed.data

  // Vérifier ownership de l'import
  const { data: importRow, error: importErr } = await supabase
    .from('mandat_imports')
    .select('id, status, mandat_id, source_url')
    .eq('id', importId)
    .eq('user_id', user.id)
    .single()

  if (importErr || !importRow) {
    return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
  }

  // Déjà rattaché → retourner le mandat existant
  if (importRow.mandat_id) {
    return NextResponse.json({ mandat_id: importRow.mandat_id }, { status: 200 })
  }

  // Vérifier ownership du bien
  const { data: bien, error: bienErr } = await supabase
    .from('biens')
    .select('id')
    .eq('id', bien_id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (bienErr || !bien) {
    return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Créer le mandat à compléter
  const { data: mandat, error: mandatErr } = await supabase
    .from('mandats')
    .insert({
      user_id:        user.id,
      bien_id,
      numero:         generateNumero(),
      statut:         'a_completer',
      type:           'exclusif',
      date_signature: today,
      date_debut:     today,
      reconductible:  true,
      prix_vente:     0,
    })
    .select('id')
    .single()

  if (mandatErr || !mandat) {
    console.error('[rattacher] Création mandat:', mandatErr?.message)
    return NextResponse.json({ error: 'Erreur création mandat' }, { status: 500 })
  }

  // Lier l'import au mandat + marquer completed
  const { error: updateErr } = await supabase
    .from('mandat_imports')
    .update({ mandat_id: mandat.id, status: 'completed' })
    .eq('id', importId)

  if (updateErr) {
    console.error('[rattacher] Mise à jour import:', updateErr.message)
  }

  // Conserver le document source dans mandat_documents pour la fiche mandat
  if (importRow.source_url?.includes('/')) {
    const fileName = importRow.source_url.split('/').pop() ?? 'Document importé'
    await supabase.from('mandat_documents').insert({
      mandat_id: mandat.id,
      user_id:   user.id,
      type:      'mandat_pdf',
      nom:       fileName,
      url:       importRow.source_url, // chemin storage — générer une URL signée à l'affichage
    })
  }

  console.log(`[rattacher] Import ${importId} → mandat ${mandat.id} (bien ${bien_id})`)

  return NextResponse.json({ mandat_id: mandat.id }, { status: 201 })
}
