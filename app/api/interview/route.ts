import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { sendMail } from '@/lib/mail'

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const b = await req.json()
  const { data: cand } = await a.db.from('candidates').select('id, name, email').eq('id', b.candidateId).eq('company_id', a.co.id).maybeSingle()
  if (!cand) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  if (!b.scheduledAt || isNaN(new Date(b.scheduledAt).getTime())) return NextResponse.json({ error: 'Choose a date and time' }, { status: 400 })
  const { data: job } = b.jobId ? await a.db.from('jobs').select('title').eq('id', b.jobId).maybeSingle() : { data: null }
  const { error } = await a.db.from('interviews').insert({
    company_id: a.co.id, candidate_id: cand.id, job_id: b.jobId || null, scheduled_at: b.scheduledAt,
    mode: b.mode, place: b.place || null, interviewer: b.interviewer || null, notes: b.notes || null
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await a.db.from('candidates').update({ status: 'interview' }).eq('id', cand.id)
  const when = new Date(b.scheduledAt).toLocaleString('en-GB', { timeZone: a.co.timezone, dateStyle: 'full', timeStyle: 'short' })
  await sendMail(a.db, a.co, cand.email, `Interview invitation from ${a.co.name}`,
    `Hello ${cand.name},\n\nWe would like to invite you for an interview${job ? ` for the position of ${job.title}` : ''}.\n\nDate and time: ${when}\nType: ${b.mode}\n${b.place ? `Place or link: ${b.place}\n` : ''}${b.interviewer ? `Interviewer: ${b.interviewer}\n` : ''}${b.notes ? `\n${b.notes}\n` : ''}\nPlease reply to confirm.\n\n${a.co.name}`)
  return NextResponse.json({ ok: true, emailed: !!cand.email })
}
