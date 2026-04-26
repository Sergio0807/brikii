import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Synchronise la couche CRM après ajout d'un propriétaire à un bien.
 *
 * - contact_biens : lien contact ↔ bien avec role=proprietaire
 * - contact_roles : rôle proprietaire_vendeur actif sur le contact
 * - contacts.types : snapshot dénormalisé mis à jour
 *
 * Les erreurs ne font pas échouer l'opération principale — elles sont loggées.
 */
export async function syncBienProprietaire(
  supabase: SupabaseClient,
  { contactId, bienId }: { contactId: string; bienId: string }
): Promise<void> {
  await Promise.all([
    syncContactBien(supabase, contactId, bienId),
    syncContactRole(supabase, contactId, 'proprietaire_vendeur'),
  ])
  await syncContactTypesSnapshot(supabase, contactId, 'proprietaire_vendeur')
}

// ── Internals ─────────────────────────────────────────────────────────────────

async function syncContactBien(
  supabase: SupabaseClient,
  contactId: string,
  bienId: string
): Promise<void> {
  const { error } = await supabase
    .from('contact_biens')
    .upsert(
      { contact_id: contactId, bien_id: bienId, role: 'proprietaire' },
      { onConflict: 'contact_id,bien_id,role', ignoreDuplicates: true }
    )
  if (error) {
    console.error('[crm-sync] contact_biens upsert failed:', error.message)
  }
}

async function syncContactRole(
  supabase: SupabaseClient,
  contactId: string,
  typeCode: string
): Promise<void> {
  const { error } = await supabase
    .from('contact_roles')
    .upsert(
      { contact_id: contactId, type: typeCode, actif: true },
      { onConflict: 'contact_id,type', ignoreDuplicates: false }
    )
  if (error) {
    console.error('[crm-sync] contact_roles upsert failed:', error.message)
  }
}

async function syncContactTypesSnapshot(
  supabase: SupabaseClient,
  contactId: string,
  typeCode: string
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('contacts')
    .select('types')
    .eq('id', contactId)
    .single()

  if (fetchError) {
    console.error('[crm-sync] contacts.types fetch failed:', fetchError.message)
    return
  }

  const current: string[] = data?.types ?? []
  if (current.includes(typeCode)) return

  const { error: updateError } = await supabase
    .from('contacts')
    .update({ types: [...current, typeCode] })
    .eq('id', contactId)

  if (updateError) {
    console.error('[crm-sync] contacts.types update failed:', updateError.message)
  }
}
