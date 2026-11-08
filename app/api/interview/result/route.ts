import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { sendMail } from '@/lib/mail'
import { inviteMail, selectedMail } from '@/lib/interviewMail'

// Sets the interview result (and emails the candidate when selected) or re-sends the invitation.
export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { interviewId, action, result } = await req.json()
  const { data: iv } = await a.db.from('interviews').select('*, candidates(name, email), jobs(title)')
    .eq('id', interviewId).eq('company_id', a.co.id).maybeSingle()
  if (!iv) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  const name = iv.candidates?.name || 'there'
  const email = iv.candidates?.email

  if (action === 'resend') {
    const m = inviteMail(a.co, name, iv, iv.jobs?.title)
    const sent = await sendMail(a.db, a.co, email, m.subject, m.text)
    return NextResponse.json({ ok: true, emailed: sent.ok, reason: sent.reason })
  }

  if (!['pending', 'selected', 'hold', 'rejected'].includes(result)) return NextResponse.json({ error: 'Unknown result' }, { status: 400 })
  await a.db.from('interviews').update({ result, status: result === 'pending' ? iv.status : 'completed' }).eq('id', iv.id)
  if (result === 'selected' || result === 'rejected') await a.db.from('candidates').update({ status: result }).eq('id', iv.candidate_id)
  await a.db.from('activity_log').insert({
    company_id: a.co.id, actor_id: a.user.id, actor_name: a.staff?.name || a.user.email, actor_role: a.role,
    action: 'Interview result: ' + result, detail: name
  })
  if (result !== 'selected') return NextResponse.json({ ok: true, emailed: null })
  const m = selectedMail(a.co, name, iv, iv.jobs?.title)
  const sent = await sendMail(a.db, a.co, email, m.subject, m.text)
  return NextResponse.json({ ok: true, emailed: sent.ok, reason: sent.reason })
}
