'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiButton } from '@/components/shared/BrikiiButton'
import { AgenceSearchInput, type Agence } from '@/components/shared/AgenceSearchInput'

const STATUTS = [
  { value: 'agent_immobilier',  label: 'Agent immobilier' },
  { value: 'mandataire',        label: 'Agent mandataire' },
  { value: 'negociateur',       label: 'Négociateur' },
  { value: 'promoteur',         label: 'Promoteur' },
  { value: 'marchand_biens',    label: 'Marchand de biens' },
  { value: 'notaire',           label: 'Notaire' },
  { value: 'autre',             label: 'Autre' },
]

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '', email: '', password: '', statut_professionnel: '',
  })
  const [agence, setAgence] = useState<Agence | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          prenom:               form.prenom,
          nom:                  form.nom,
          telephone:            form.telephone,
          statut_professionnel: form.statut_professionnel,
          agence_id:            agence?.id ?? null,
          agence_nom:           agence?.nom ?? null,
        },
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--brikii-bg-subtle)] px-4">
        <div
          className="bg-[var(--brikii-bg)] p-8 w-full max-w-sm text-center"
          style={{ borderRadius: 'var(--brikii-radius-card)', boxShadow: 'var(--brikii-shadow-card)' }}
        >
          <div className="w-10 h-10 rounded-full bg-[var(--brikii-success-bg)] flex items-center justify-center mx-auto mb-4">
            <span className="text-[var(--brikii-success)] text-lg">✓</span>
          </div>
          <h1 className="text-base font-semibold text-[var(--brikii-text)] mb-2">Vérifiez votre email</h1>
          <p className="text-sm text-[var(--brikii-text-muted)]">
            Un lien de confirmation a été envoyé à <strong>{form.email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--brikii-bg-subtle)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brikii-dark)] font-bold"
            style={{ background: 'var(--brikii-yellow)' }}
          >
            B
          </span>
          <span className="font-semibold text-lg">Brikii</span>
        </div>

        <div
          className="bg-[var(--brikii-bg)] p-8"
          style={{ borderRadius: 'var(--brikii-radius-card)', boxShadow: 'var(--brikii-shadow-card)' }}
        >
          <h1 className="text-base font-semibold text-[var(--brikii-text)] mb-6">Créer un compte</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <BrikiiInput
                label="Prénom"
                value={form.prenom}
                onChange={e => set('prenom', e.target.value)}
                required
              />
              <BrikiiInput
                label="Nom"
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--brikii-text)]">
                Statut professionnel <span className="text-[var(--brikii-danger)]">*</span>
              </label>
              <select
                value={form.statut_professionnel}
                onChange={e => set('statut_professionnel', e.target.value)}
                required
                className="w-full h-9 px-3 text-sm bg-[var(--brikii-bg)] text-[var(--brikii-text)] border border-[var(--brikii-border)] focus:border-[var(--brikii-dark)] outline-none transition-colors"
                style={{ borderRadius: 'var(--brikii-radius-input)' }}
              >
                <option value="">Sélectionner...</option>
                {STATUTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <BrikiiInput
              label="Téléphone"
              type="tel"
              value={form.telephone}
              onChange={e => set('telephone', e.target.value)}
              placeholder="+33 6 00 00 00 00"
              autoComplete="tel"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--brikii-text)]">
                Agence / Réseau <span className="text-[var(--brikii-text-muted)]">(facultatif)</span>
              </label>
              <AgenceSearchInput
                onSelect={setAgence}
                placeholder="Rechercher IAD, Safti, Century 21…"
              />
            </div>

            <BrikiiInput
              label="Email"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
              autoComplete="email"
            />
            <BrikiiInput
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="8 caractères minimum"
              required
              minLength={8}
              autoComplete="new-password"
            />

            {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}

            <BrikiiButton type="submit" loading={loading} className="w-full mt-1">
              Créer mon compte
            </BrikiiButton>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--brikii-text-muted)]">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-[var(--brikii-text)] font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
