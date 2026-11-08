import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { sendMail } from '@/lib/mail'

// Sends an email to a candidate from the company's own Gmail. Selecting or rejecting also updates their status.
export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { candidateId, kind, subject, body } = await req.json()
  if (!subject || !body) return NextResponse.json({ error: 'Write a subject and a message' }, { status: 400 })
  const { data: cand } = await a.db.from('candidates').select('id, name, email').eq('id', candidateId).eq('company_id', a.co.id).maybeSingle()
  if (!cand) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  if (kind === 'selected' || kind === 'rejected') await a.db.from('candidates').update({ status: kind }).eq('id', cand.id)
  const sent = await sendMail(a.db, a.co, cand.email, String(subject), String(body))
  await a.db.from('activity_log').insert({
    company_id: a.co.id, actor_id: a.user.id, actor_name: a.staff?.name || a.user.email, actor_role: a.role,
    action: kind === 'selected' ? 'Selected candidate' : kind === 'rejected' ? 'Rejected candidate' : 'Emailed candidate',
    detail: `${cand.name}${sent.ok ? '' : ' (email not sent)'}`
  })
  return NextResponse.json({ ok: true, emailed: sent.ok, reason: sent.reason })
}
