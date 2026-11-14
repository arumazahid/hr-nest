'use client'
import { useEffect, useState } from 'react'
import { Users, UserCheck, Clock, CalendarDays, Star } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { toast } from './Toast'

const short = (day: string) => new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function TeamHome({ name }: { name?: string }) {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})

  async function call(method: string, body?: any) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/team', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: body ? JSON.stringify(body) : undefined })
    return { ok: res.ok, out: await res.json() }
  }
  const load = async () => { const { ok, out } = await call('GET'); ok ? setD(out) : setErr(out.error) }
  useEffect(() => { load() }, [])

  async function act(body: any, okText: string) {
    const { ok, out } = await call('POST', body)
    if (!ok) return toast(out.error || 'Could not save', 'err')
    toast(okText); load()
  }

  if (err) return <div className="banner errbanner">{err}</div>
  if (!d) return <p className="muted">Loading...</p>
  if (d.noTeam) return (
    <div className="card emptycomm"><Users size={30} /><b>You are not in a team yet</b>
      <span className="muted">Ask HR to put you in a department. Your team will appear here as soon as they do.</span></div>
  )

  const inSet = new Map<string, any>(d.present.map((x: any) => [x.employee_id, x]))
  const away = new Set(d.away)
  const perf = new Map<string, any>(d.perf.map((p: any) => [p.employee_id, p]))
  const status = (id: string) => away.has(id) ? ['On leave', 'tag'] : inSet.has(id) ? (inSet.get(id).late ? ['Late', 'tag warn'] : ['In', 'tag ok']) : ['Not in yet', 'tag']
  const late = d.present.filter((x: any) => x.late).length
  const kp: [string, number, any, string][] = [
    ['Team members', d.members.length, Users, '#E0E7FF'], ['In today', d.present.length, UserCheck, '#DCFCE7'],
    ['Late', late, Clock, '#FEF3C7'], ['Leave requests', d.pending.length, CalendarDays, '#E0F2FE']
  ]

  return (
    <>
      <div className="hero2">
        <div><h1>{d.dept}{name ? '' : ''}</h1><p>Your team today. You can see and manage only the people in your own team.</p></div>
      </div>
      <div className="kpis">
        {kp.map(([l, v, Icon, bg]) => <div className="kpi" key={l}><div className="ic" style={{ background: bg }}><Icon size={18} /></div><small>{l}</small><b>{v}</b></div>)}
      </div>

      {d.pending.length > 0 && (
        <div className="card">
          <h3>Leave requests from your team</h3>
          {d.pending.map((l: any) => (
            <div className="reqrow" key={l.id}>
              <div style={{ flex: 1 }}><b>{l.employees?.name}</b><div className="muted">{short(l.day)} · {l.type} day · {l.leave_type}{l.reason ? ' · ' + l.reason : ''}</div></div>
              <button className="btn sm" onClick={() => act({ action: 'leave', id: l.id, status: 'approved' }, 'Leave approved')}>Approve</button>
              <button className="btn ghost sm" onClick={() => act({ action: 'leave', id: l.id, status: 'rejected' }, 'Leave rejected')}>Reject</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Your team and this month's remarks</h3>
        <p className="muted">Give a rating and a short remark. Employees see their own remarks, and HR sees them all.</p>
        <div className="perfgrid">
          {d.members.map((m: any) => {
            const p = perf.get(m.id) || {}
            const [stText, stClass] = status(m.id)
            return (
              <div className="perfrow" key={m.id}>
                <div className="perfwho">
                  <div className="avatar sm">{m.photo_url ? <img src={m.photo_url} alt="" /> : m.name[0]}</div>
                  <div><b>{m.name}</b> <span className={stClass}>{stText}</span><div className="muted">{m.job_title || m.employee_code}</div></div>
                </div>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} title={n + ' / 5'} className={(p.rating || 0) >= n ? 'on' : ''}
                      onClick={() => act({ action: 'remark', employeeId: m.id, rating: p.rating === n ? null : n }, 'Rating saved')}><Star size={18} /></button>
                  ))}
                </div>
                <input className="remark" placeholder="Write a remark" value={draft[m.id] ?? p.notes ?? ''}
                  onChange={e => setDraft({ ...draft, [m.id]: e.target.value })}
                  onBlur={() => draft[m.id] !== undefined && draft[m.id] !== (p.notes ?? '') && act({ action: 'remark', employeeId: m.id, notes: draft[m.id] }, 'Remark saved')}
                  onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
