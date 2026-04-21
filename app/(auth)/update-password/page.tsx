'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiButton } from '@/components/shared/BrikiiButton'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
          <h1 className="text-base font-semibold text-[var(--brikii-text)] mb-2">Nouveau mot de passe</h1>
          <p className="text-xs text-[var(--brikii-text-muted)] mb-6">
            Choisissez un mot de passe sécurisé pour votre compte.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <BrikiiInput
              label="Nouveau mot de passe"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              required
              autoComplete="new-password"
            />
            <BrikiiInput
              label="Confirmer le mot de passe"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}

            <BrikiiButton type="submit" loading={loading} className="w-full mt-1">
              Mettre à jour
            </BrikiiButton>
          </form>
        </div>
      </div>
    </div>
  )
}
