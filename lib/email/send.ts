import { resend } from './resend'

const FROM = `${process.env.RESEND_FROM_NAME ?? 'Brikii'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@brikii.fr'}>`

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  })

  if (error) throw new Error(error.message)
  return data
}
