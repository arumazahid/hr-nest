import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { decrypt } from './crypto'
import { processCv } from './process'

const OK = ['pdf', 'docx', 'png', 'jpg', 'jpeg']

export async function checkInbox(db: any, co: any) {
  const { data: sec } = await db.from('company_secrets').select('imap_password_enc').eq('company_id', co.id).maybeSingle()
  if (!co.imap_email || !sec?.imap_password_enc) return { error: 'Add the inbox email and app password in Settings' }
  const { data: jobs } = await db.from('jobs').select('*').eq('company_id', co.id).eq('status', 'open')
  if (!jobs?.length) return { error: 'Add an open job first' }
  const client = new ImapFlow({
    host: co.imap_host, port: 993, secure: true, logger: false,
    auth: { user: co.imap_email, pass: decrypt(sec.imap_password_enc) }
  })
  let added = 0
  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    const uids = (await client.search({ since: new Date(Date.now() - 7 * 86400000) })) || []
    for (const uid of uids.slice(-20)) {
      const msg: any = await client.fetchOne(String(uid), { source: true }, { uid: true })
      const mail = await simpleParser(msg.source)
      const id = mail.messageId || `${co.id}-${uid}`
      const { data: seen } = await db.from('processed_emails').select('message_id').eq('company_id', co.id).eq('message_id', id).maybeSingle()
      if (seen) continue
      await db.from('processed_emails').insert({ company_id: co.id, message_id: id })
      const subject = (mail.subject || '').toLowerCase()
      const job = jobs.find((j: any) => subject.includes(j.title.toLowerCase()))
      const from = mail.from?.value?.[0]
      for (const att of mail.attachments || []) {
        const name = att.filename || 'cv'
        if (!OK.includes(name.toLowerCase().split('.').pop() || '')) continue
        const r: any = await processCv(db, co.id, jobs, { name, buf: att.content }, 'email', job?.id || null,
          { name: from?.name || '', email: from?.address || '' })
        if (r.ok) added++
      }
    }
  } finally {
    lock.release()
    await client.logout()
  }
  return { added }
}
