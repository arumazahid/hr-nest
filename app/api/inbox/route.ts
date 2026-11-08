import { NextRequest, NextResponse } from 'next/server'
import { admin, authed } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'
import { checkInbox } from '@/lib/inbox'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'No' }, { status: 401 })
  const db = admin()
  const { data: companies } = await db.from('companies').select('*')
  const out = []
  for (const co of companies || []) out.push(await checkInbox(db, co).catch((e: any) => ({ error: e.message })))
  return NextResponse.json(out)
}

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const body = await req.json()
  if (body.action === 'save') {
    await a.db.from('company_secrets').upsert({ company_id: a.co.id, imap_password_enc: encrypt(String(body.password).replace(/\s/g, '')) })
    return NextResponse.json({ ok: true })
  }
  try {
    return NextResponse.json(await checkInbox(a.db, a.co))
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not read the inbox: ' + e.message }, { status: 500 })
  }
}
