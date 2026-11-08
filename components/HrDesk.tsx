'use client'
import { useEffect, useState } from 'react'
import { UserPlus, CalendarCheck, CalendarClock, Clock, ShieldCheck } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { toast } from './Toast'
import { logActivity } from '@/lib/activity'
import PerformanceBoard from './PerformanceBoard'

const short = (day: string) => new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function HrDesk({ company, role, go }: { company: any; role: string; go: (p: string) => void }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: company.timezone })
  const [pending, setPending] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [ivs, setIvs] = useState<any[]>([])
  const [late, setLate] = useState(0)
  const [emps, setEmps] = useState<any[]>([])
  const [pick, setPick] = useState<Record<string, string>>({})

  async function api(method: string, body?: any) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/staff', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: body ? JSON.stringify(body) : undefined })
    return res.json()
  }
  const load = async () => {
    const out = await api('GET'); setPending(out.pending || [])
    const [lv, iv, la, em] = await Promise.all([
      sb.from('leaves').select('id, day, type, leave_type, reason, employees(name)').eq('status', 'pending').order('day').limit(20),
      sb.from('interviews').select('id, scheduled_at, mode, candidates(name)').eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5),
      sb.from('attendance').select('id', { count: 'exact', head: true }).eq('day', today).eq('late', true),
      sb.from('employees').select('id, name, employee_code').eq('active', true).order('name')
    ])
    setLeaves(lv.data || []); setIvs(iv.data || []); setLate(la.count || 0); setEmps(em.data || [])
  }
  useEffect(() => { load() }, [])

  async function decide(s: any, action: string) {
    const out = await api('PATCH', { id: s.id, action, employeeId: pick[s.id] ?? s.employee_id })
    if (out.error) return toast(out.error, 'err')
    toast(action === 'approve' ? `${s.name || s.email} approved` : 'Request rejected'); load()
  }
  async function leave(l: any, status: string) {
    const { error } = await sb.from('leaves').update({ status }).eq('id', l.id)
    if (error) return toast(error.message, 'err')
    toast(`Leave ${status}`); logActivity(company.id, `Leave ${status}`, `${l.employees?.name} · ${l.day}`); load()
  }

  const tiles: [string, number, string, any, string][] = [
    ['Sign-ups to verify', pending.length, 'Waiting for your approval', UserPlus, '#E0E7FF'],
    ['Leave requests', leaves.length, 'Waiting for a decision', CalendarCheck, '#FEF3C7'],
    ['Interviews', ivs.length, 'Upcoming', CalendarClock, '#DCFCE7'],
    ['Late today', late, 'Checked in after the grace time', Clock, '#FEE2E2']
  ]

  return (
    <>
      <div className="hero2">
        <div>
          <h1>HR Desk</h1>
          <p>Everything you manage in one place. Your activity here is private and not visible to employees or other HR users.</p>
        </div>
        <span className="pill dark"><ShieldCheck size={15} /> Private workspace</span>
      </div>
      <div className="kpis">
        {tiles.map(([l, v, h, Icon, bg]) => (
          <div className="kpi" key={l}><div className="ic" style={{ background: bg }}><Icon size={18} /></div><small>{l}</small><b>{v}</b><span className="muted">{h}</span></div>
        ))}
      </div>

      <PerformanceBoard company={company} canEdit />

      <div className="cols2">
        <div className="card">
          <h3>New account requests</h3>
          <p className="muted">Approve only people you recognise. The Employee ID they entered is checked against your employee list.</p>
          {pending.length === 0 && <p className="muted">No one is waiting.</p>}
          {pending.map(s => (
            <div className="reqrow" key={s.id}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <b>{s.name || s.email}</b> {s.id_verified && <span className="tag ok">ID matched</span>}
                <div className="muted">{s.email}</div>
              </div>
              <select value={pick[s.id] ?? s.employee_id ?? ''} onChange={e => setPick({ ...pick, [s.id]: e.target.value })}>
                <option value="">Which employee?</option>
                {emps.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
              </select>
              <button className="btn sm" onClick={() => decide(s, 'approve')}>Approve</button>
              <button className="btn ghost sm" onClick={() => decide(s, 'reject')}>Reject</button>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Leave requests</h3>
          {leaves.length === 0 && <p className="muted">No pending requests.</p>}
          {leaves.map(l => (
            <div className="reqrow" key={l.id}>
              <div style={{ flex: 1 }}><b>{l.employees?.name}</b><div className="muted">{short(l.day)} · {l.type} day · {l.leave_type}{l.reason ? ' · ' + l.reason : ''}</div></div>
              <button className="btn sm" onClick={() => leave(l, 'approved')}>Approve</button>
              <button className="btn ghost sm" onClick={() => leave(l, 'rejected')}>Reject</button>
            </div>
          ))}
          <button className="linkbtn" onClick={() => go('Leave')}>Open Leave Management</button>
        </div>
      </div>
    </>
  )
}
