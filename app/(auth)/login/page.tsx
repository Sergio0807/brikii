'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BrikiiInput } from '@/components/shared/BrikiiInput'
import { BrikiiButton } from '@/components/shared/BrikiiButton'

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: 'Le lien de confirmation est invalide ou a expiré. Veuillez vous réinscrire.',
  otp_expired:          'Le lien de confirmation a expiré. Veuillez vous réinscrire.',
  access_denied:        'Accès refusé. Veuillez vous réinscrire.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect    = searchParams.get('redirect') ?? '/dashboard'
  const confirmed   = searchParams.get('confirmed') === 'true'
  const errorParam  = searchParams.get('error')
  const errorCode   = searchParams.get('error_code')

  const urlError = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES[errorParam ?? ''] ?? 'Une erreur est survenue.')
    : errorParam
      ? (ERROR_MESSAGES[errorParam] ?? 'Une erreur est survenue.')
      : null

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {confirmed && (
        <p className="text-xs text-[var(--brikii-success)] bg-[var(--brikii-success-bg)] px-3 py-2 rounded">
          Votre email est confirmé. Vous pouvez vous connecter.
        </p>
      )}
      {urlError && (
        <p className="text-xs text-[var(--brikii-danger)] bg-[var(--brikii-danger-bg,#fff0f0)] px-3 py-2 rounded">
          {urlError}
        </p>
      )}
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
  )
}

export default function LoginPage() {
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
          <h1 className="text-base font-semibold text-[var(--brikii-text)] mb-6">Connexion</h1>

          <Suspense>
            <LoginForm />
          </Suspense>

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
