import nodemailer from 'nodemailer'
import { decrypt } from './crypto'

export type MailResult = { ok: boolean; reason?: string }

// Returns what really happened, so the screen can tell the truth instead of guessing.
export async function sendMail(db: any, co: any, to: string | null | undefined, subject: string, text: string): Promise<MailResult> {
  if (!to) return { ok: false, reason: 'This person has no email address saved' }
  if (!co.imap_email) return { ok: false, reason: 'Gmail is not connected. Add it in Settings first' }
  const { data: sec } = await db.from('company_secrets').select('imap_password_enc').eq('company_id', co.id).maybeSingle()
  if (!sec?.imap_password_enc) return { ok: false, reason: 'Gmail app password is not saved. Add it in Settings' }
  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: co.imap_email, pass: decrypt(sec.imap_password_enc) }
    })
    await transport.sendMail({ from: `${co.name} <${co.imap_email}>`, to, subject, text, replyTo: co.reply_to_email || undefined })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, reason: 'Gmail did not accept the email (' + String(e?.message || e).slice(0, 120) + '). Check the app password in Settings' }
  }
}
