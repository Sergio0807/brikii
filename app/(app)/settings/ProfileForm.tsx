'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateProfile } from '@/app/actions/profile'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { BrikiiCard } from '@/components/shared/BrikiiCard'
import { AgenceSearchInput, type Agence } from '@/components/shared/AgenceSearchInput'

interface Profile {
  civilite?:             string | null
  prenom?:               string | null
  nom?:                  string | null
  telephone?:            string | null
  statut_professionnel?: string | null
  siren?:                string | null
  rsac?:                 string | null
  agence_mandant_id?:    string | null
  agence_mandant?:       string | null
}

const CIVILITES = ['M.', 'Mme', 'Autre']
const STATUTS = [
  { value: 'agent_immobilier',  label: 'Agent immobilier' },
  { value: 'mandataire',        label: 'Agent mandataire' },
  { value: 'negociateur',       label: 'Négociateur' },
  { value: 'promoteur',         label: 'Promoteur' },
  { value: 'marchand_biens',    label: 'Marchand de biens' },
  { value: 'notaire',           label: 'Notaire' },
  { value: 'autre',             label: 'Autre' },
]

const STATUTS_AGENCE_OBLIGATOIRE = ['agent_immobilier', 'mandataire', 'negociateur']

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const [statut, setStatut] = useState(profile?.statut_professionnel ?? '')
  const [agence, setAgence] = useState<Agence | null>(
    profile?.agence_mandant_id
      ? { id: profile.agence_mandant_id, nom: profile.agence_mandant ?? '' }
      : null
  )
  const [agenceError, setAgenceError] = useState(false)

  const agenceRequise = STATUTS_AGENCE_OBLIGATOIRE.includes(statut)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (agenceRequise && !agence) {
      setAgenceError(true)
      return
    }
    setAgenceError(false)
    const formData = new FormData(e.currentTarget)
    formData.set('agence_mandant_id', agence?.id ?? '')
    formData.set('agence_mandant', agence?.nom ?? '')

    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.success) {
        toast.success('Profil mis à jour')
        router.refresh()
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    })
  }

  return (
    <BrikiiCard>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
        {/* Civilité */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--brikii-text-muted)]">Civilité</label>
          <select
            name="civilite"
            defaultValue={profile?.civilite ?? ''}
            className="h-9 rounded-md border border-[var(--brikii-border)] bg-[var(--brikii-bg)] px-3 text-sm text-[var(--brikii-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brikii-yellow)]"
          >
            <option value="">—</option>
            {CIVILITES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput
            label="Prénom"
            name="prenom"
            defaultValue={profile?.prenom ?? ''}
            placeholder="Votre prénom"
            autoComplete="given-name"
          />
          <BrikiiInput
            label="Nom"
            name="nom"
            defaultValue={profile?.nom ?? ''}
            placeholder="Votre nom"
            autoComplete="family-name"
          />
        </div>

        <BrikiiInput
          label="Téléphone"
          name="telephone"
          type="tel"
          defaultValue={profile?.telephone ?? ''}
          placeholder="+33 6 00 00 00 00"
          autoComplete="tel"
        />

        {/* Statut professionnel */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--brikii-text-muted)]">Statut professionnel</label>
          <select
            name="statut_professionnel"
            value={statut}
            onChange={e => { setStatut(e.target.value); setAgenceError(false) }}
            className="h-9 rounded-md border border-[var(--brikii-border)] bg-[var(--brikii-bg)] px-3 text-sm text-[var(--brikii-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brikii-yellow)]"
          >
            <option value="">—</option>
            {STATUTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Agence / Réseau mandant */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--brikii-text-muted)]">
            Agence / Réseau mandant
            {agenceRequise
              ? <span className="text-[var(--brikii-danger)] ml-1">*</span>
              : <span className="text-[var(--brikii-text-muted)] ml-1">(facultatif)</span>
            }
          </label>
          <AgenceSearchInput
            defaultValue={agence}
            onSelect={a => { setAgence(a); setAgenceError(false) }}
            placeholder="Rechercher IAD, Safti, Century 21…"
          />
          {agenceError && (
            <p className="text-xs text-[var(--brikii-danger)]">
              Obligatoire pour ce statut — recherchez votre agence ou réseau.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <BrikiiInput
            label="SIREN"
            name="siren"
            defaultValue={profile?.siren ?? ''}
            placeholder="123 456 789"
          />
          <BrikiiInput
            label="RSAC"
            name="rsac"
            defaultValue={profile?.rsac ?? ''}
            placeholder="RSAC 123 456 789"
          />
        </div>

        <div className="pt-2">
          <BrikiiButton type="submit" loading={isPending}>
            Enregistrer
          </BrikiiButton>
        </div>
      </form>
    </BrikiiCard>
  )
}
