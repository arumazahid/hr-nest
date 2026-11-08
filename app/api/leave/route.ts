import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { sendMail } from '@/lib/mail'

export async function PATCH(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { id, status } = await req.json()
  if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  const { data: l } = await a.db.from('leaves').select('*, employees(name, email)').eq('id', id).eq('company_id', a.co.id).maybeSingle()
  if (!l) return NextResponse.json({ error: 'Leave not found' }, { status: 404 })
  await a.db.from('leaves').update({ status }).eq('id', id)
  await sendMail(a.db, a.co, l.employees?.email, `Your leave request was ${status}`,
    `Hello ${l.employees?.name},\n\nYour ${l.leave_type} leave request for ${l.day} was ${status}.\n\n${a.co.name}`)
  return NextResponse.json({ ok: true })
}
