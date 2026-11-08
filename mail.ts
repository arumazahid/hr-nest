import nodemailer from 'nodemailer'
import { decrypt } from './crypto'

export async function sendMail(db: any, co: any, to: string | null | undefined, subject: string, text: string) {
  if (!to || !co.imap_email) return
  const { data: sec } = await db.from('company_secrets').select('imap_password_enc').eq('company_id', co.id).maybeSingle()
  if (!sec?.imap_password_enc) return
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: co.imap_email, pass: decrypt(sec.imap_password_enc) }
  })
  await transport.sendMail({ from: `${co.name} <${co.imap_email}>`, to, subject, text }).catch(() => {})
}
