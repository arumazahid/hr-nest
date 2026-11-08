'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { toast } from './Toast'

const ics = (i: any, tz: string) => {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const s = new Date(i.scheduled_at)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `UID:${i.id}@hrnest`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(s)}`,
    `DTEND:${f(new Date(s.getTime() + 3600000))}`, `SUMMARY:Interview: ${i.candidates?.name}`, `LOCATION:${i.place || ''}`, 'END:VEVENT', 'END:VCALENDAR']
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }))
  a.download = 'interview.ics'
  a.click()
}

export default function Interviews({ company }: { company: any }) {
  const [rows, setRows] = useState<any[]>([])
  const load = async () => {
    const { data } = await sb.from('interviews').select('*, candidates(name, email), jobs(title)').order('scheduled_at')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: company.timezone, dateStyle: 'medium', timeStyle: 'short' })
  async function call(body: any) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/interview/result', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify(body) })
    return res.json()
  }
  const report = (out: any, what: string, who: string) => {
    if (out.error) return toast(out.error, 'err')
    if (out.emailed === true) toast(`${what} email sent to ${who}`)
    else if (out.emailed === false) toast(`Saved, but the email was NOT sent: ${out.reason}`, 'err')
  }
  async function setResult(i: any, result: string) {
    const out = await call({ interviewId: i.id, result })
    if (!out.error && out.emailed == null) toast('Result saved')
    report(out, 'Selection', i.candidates?.name || 'the candidate'); load()
  }
  async function resend(i: any) {
    report(await call({ interviewId: i.id, action: 'resend' }), 'Invitation', i.candidates?.name || 'the candidate')
  }
  const now = Date.now()
  const upcoming = rows.filter(i => i.status === 'scheduled' && new Date(i.scheduled_at).getTime() >= now - 3600000)
  const rest = rows.filter(i => !upcoming.includes(i)).reverse()

  const card = (i: any) => (
    <div className="row" key={i.id} style={{ flexWrap: 'wrap', opacity: i.status === 'cancelled' ? 0.5 : 1 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <b>{i.candidates?.name}</b> <span className="tag">{i.mode}</span> {i.status !== 'scheduled' && <span className="tag">{i.status}</span>}
        <div className="muted">{when(i.scheduled_at)}{i.jobs?.title ? ` · ${i.jobs.title}` : ''}</div>
        <div className="muted">{[i.place, i.interviewer && `with ${i.interviewer}`].filter(Boolean).join(' · ')}</div>
      </div>
      <select style={{ width: 150 }} value={i.result} onChange={e => setResult(i, e.target.value)}>
        <option value="pending">Result: pending</option><option value="selected">Selected</option><option value="hold">On hold</option><option value="rejected">Rejected</option>
      </select>
      {i.status === 'scheduled' && <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => resend(i)}>Resend email</button>}
      <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => ics(i, company.timezone)}>Add to calendar</button>
      {i.status === 'scheduled' && <button className="btn ghost" style={{ marginTop: 0 }} onClick={async () => { await sb.from('interviews').update({ status: 'cancelled' }).eq('id', i.id); load() }}>Cancel</button>}
    </div>
  )

  return (
    <>
      <p className="muted">Schedule interviews from the Candidates page. The candidate gets an invitation email, and a selection email when you mark them Selected. This needs your Gmail connected in Settings; if an email cannot be sent you will see the reason here.</p>
      <h3>Upcoming ({upcoming.length})</h3>
      {upcoming.length === 0 && <p className="muted">No interviews scheduled.</p>}
      {upcoming.map(card)}
      {rest.length > 0 && <h3 style={{ marginTop: 28 }}>Past and cancelled</h3>}
      {rest.map(card)}
    </>
  )
}
