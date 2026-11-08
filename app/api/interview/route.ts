import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { sendMail } from '@/lib/mail'
import { inviteMail } from '@/lib/interviewMail'

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const b = await req.json()
  const { data: cand } = await a.db.from('candidates').select('id, name, email').eq('id', b.candidateId).eq('company_id', a.co.id).maybeSingle()
  if (!cand) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  if (!b.scheduledAt || isNaN(new Date(b.scheduledAt).getTime())) return NextResponse.json({ error: 'Choose a date and time' }, { status: 400 })
  const { data: job } = b.jobId ? await a.db.from('jobs').select('title').eq('id', b.jobId).maybeSingle() : { data: null }
  const { data: iv, error } = await a.db.from('interviews').insert({
    company_id: a.co.id, candidate_id: cand.id, job_id: b.jobId || null, scheduled_at: b.scheduledAt,
    mode: b.mode, place: b.place || null, interviewer: b.interviewer || null, notes: b.notes || null
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await a.db.from('candidates').update({ status: 'interview' }).eq('id', cand.id)
  const m = b.subject && b.body ? { subject: String(b.subject), text: String(b.body) } : inviteMail(a.co, cand.name, iv, job?.title)
  const sent = await sendMail(a.db, a.co, cand.email, m.subject, m.text)
  return NextResponse.json({ ok: true, emailed: sent.ok, reason: sent.reason })
}
