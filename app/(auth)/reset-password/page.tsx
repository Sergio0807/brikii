'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiButton } from '@/components/shared/BrikiiButton'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/api/auth/callback?next=/update-password`,
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
          <h1 className="text-base font-semibold text-[var(--brikii-text)] mb-2">Email envoyé</h1>
          <p className="text-sm text-[var(--brikii-text-muted)] mb-4">
            Si ce compte existe, vous recevrez un lien de réinitialisation sur <strong>{email}</strong>.
          </p>
          <Link href="/login" className="text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors">
            ← Retour à la connexion
          </Link>
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
          <h1 className="text-base font-semibold text-[var(--brikii-text)] mb-2">Mot de passe oublié</h1>
          <p className="text-xs text-[var(--brikii-text-muted)] mb-6">
            Entrez votre email, nous vous enverrons un lien de réinitialisation.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <BrikiiInput
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}

            <BrikiiButton type="submit" loading={loading} className="w-full">
              Envoyer le lien
            </BrikiiButton>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-[var(--brikii-text-muted)] hover:text-[var(--brikii-text)] transition-colors">
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
