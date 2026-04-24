import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getSafeRedirect(next: string | null): string {
  if (!next) return '/dashboard'
  // Refuse absolute URLs, protocol-relative paths (//), and anything without leading /
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const errorCode = searchParams.get('error_code')
  const next      = getSafeRedirect(searchParams.get('next'))

  // Supabase redirige parfois directement avec ?error= (ex: otp_expired)
  if (errorCode) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&error_code=${encodeURIComponent(errorCode)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}?confirmed=true`)
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&error_code=${encodeURIComponent(error.code ?? 'unknown')}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
