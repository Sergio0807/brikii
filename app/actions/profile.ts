'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ProfileSchema = z.object({
  civilite:              z.string().max(10).optional(),
  prenom:                z.string().max(100).optional(),
  nom:                   z.string().max(100).optional(),
  telephone:             z.string().max(20).optional(),
  statut_professionnel:  z.string().max(100).optional(),
  siren:                 z.string().max(14).optional(),
  rsac:                  z.string().max(20).optional(),
  agence_mandant_id:     z.string().uuid().optional().nullable(),
  agence_mandant:        z.string().max(200).optional().nullable(),
})

type ProfileResult =
  | { success: true }
  | { success: false; error: string }

export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'unauthorized' }

  const raw = {
    civilite:             formData.get('civilite') as string | null,
    prenom:               formData.get('prenom') as string | null,
    nom:                  formData.get('nom') as string | null,
    telephone:            formData.get('telephone') as string | null,
    statut_professionnel: formData.get('statut_professionnel') as string | null,
    siren:                formData.get('siren') as string | null,
    rsac:                 formData.get('rsac') as string | null,
    agence_mandant_id:    (formData.get('agence_mandant_id') as string | null) || null,
    agence_mandant:       (formData.get('agence_mandant') as string | null) || null,
  }

  const parsed = ProfileSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: 'Données invalides.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
