import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send'

export async function GET() {
  try {
    const data = await sendEmail({
      to: 'serge@rouanet.fr',
      subject: 'Test Brikii — Resend OK',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h1 style="font-size:20px;color:#1a1a1a">Brikii ✓</h1>
          <p style="color:#555">Resend est correctement configuré sur <strong>brikii.fr</strong>.</p>
          <p style="color:#999;font-size:12px">Email envoyé depuis l'environnement de développement.</p>
        </div>
      `,
    })
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
