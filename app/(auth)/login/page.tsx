'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiButton } from '@/components/shared/BrikiiButton'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--brikii-bg-subtle)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
          <h1 className="text-base font-semibold text-[var(--brikii-text)] mb-6">Connexion</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <BrikiiInput
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              required
              autoComplete="email"
            />
            <BrikiiInput
              label="Mot de passe"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && <p className="text-xs text-[var(--brikii-danger)]">{error}</p>}

            <BrikiiButton type="submit" loading={loading} className="w-full mt-1">
              Se connecter
            </BrikiiButton>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-center text-xs text-[var(--brikii-text-muted)]">
            <Link href="/reset-password" className="hover:text-[var(--brikii-text)] transition-colors">
              Mot de passe oublié ?
            </Link>
            <span>
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-[var(--brikii-text)] font-medium hover:underline">
                S&apos;inscrire
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
