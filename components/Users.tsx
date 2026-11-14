'use client'
import { useEffect, useState } from 'react'
import { Lock, KeyRound } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { isStrong } from '@/lib/password'
import PasswordInput from './PasswordInput'
import { toast } from './Toast'

const ROLES: [string, string][] = [
  ['admin', 'Full access: users, settings, everything'],
  ['hr', 'HR Desk, hiring, employees, attendance, leave, performance remarks, ID cards, letters'],
  ['payroll', 'Payroll and payslips, can view employees'],
  ['viewer', 'Read-only access (no payroll)'],
  ['manager', 'Own portal plus My Team: the people in their own department (attendance, leave requests, remarks). Made from an approved employee on the Users page'],
  ['employee', 'Own portal only: own attendance, leave, payslips and HR remarks (needs the company code, Employee ID and approval)']
]

export default function Users({ company, onCode }: { company: any; onCode: (code: string) => void }) {
  const [tab, setTab] = useState('team')
  const [staff, setStaff] = useState<any[]>([])
  const [emps, setEmps] = useState<any[]>([])
  const [log, setLog] = useState<any[]>([])
  const [who, setWho] = useState('')
  const [pick, setPick] = useState<Record<string, string>>({})
  const [f, setF] = useState({ name: '', email: '', role: 'hr', password: '' })
  const [reset, setReset] = useState<{ id: string; pw: string } | null>(null)

  const load = async () => {
    const { data } = await sb.from('staff').select('*').order('created_at')
    setStaff(data || [])
    const { data: e } = await sb.from('employees').select('id, name, employee_code').eq('active', true).order('name')
    setEmps(e || [])
  }
  const loadLog = async () => {
    const { data } = await sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(300)
    setLog(data || [])
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (tab === 'log') loadLog() }, [tab])

  async function call(method: string, query = '', body?: any) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/staff' + query, {
      method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token },
      body: body ? JSON.stringify(body) : undefined
    })
    return res.json()
  }

  async function add() {
    if (f.password && !isStrong(f.password)) return toast('Password must be strong: 10+ characters, uppercase, lowercase, number and symbol', 'err')
    const out = await call('POST', '', f)
    if (out.error) return toast(out.error, 'err')
    setF({ name: '', email: '', role: 'hr', password: '' }); toast('User added'); load()
  }
  async function decide(s: any, action: string) {
    const out = await call('PATCH', '', { id: s.id, action, employeeId: pick[s.id] ?? s.employee_id })
    if (out.error) return toast(out.error, 'err')
    toast(action === 'approve' ? 'Approved' : 'Rejected'); load()
  }
  async function doReset() {
    if (!reset) return
    const out = await call('PATCH', '', { id: reset.id, action: 'reset_password', password: reset.pw })
    if (out.error) return toast(out.error, 'err')
    toast('New password set. Share it with the user privately.'); setReset(null)
  }
  async function newCode() {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { error } = await sb.from('companies').update({ join_code: code }).eq('id', company.id)
    if (error) return toast(error.message, 'err')
    onCode(code); toast('New company code created')
  }

  const pending = staff.filter(s => s.status === 'pending')
  const rest = staff.filter(s => s.status !== 'pending')
  const actors = Array.from(new Set(log.map(l => l.actor_name).filter(Boolean)))
  const shown = log.filter(l => !who || l.actor_name === who)

  return (
    <>
      <div className="hero2 slim">
        <div><h1>Users and security</h1><p>Visible to the admin only. HR and employees cannot open this page or the activity log.</p></div>
        <span className="pill dark"><Lock size={15} /> Admin only</span>
      </div>
      <div className="tabs">
        <button className={'tab' + (tab === 'team' ? ' on' : '')} onClick={() => setTab('team')}>Team and approvals</button>
        <button className={'tab' + (tab === 'log' ? ' on' : '')} onClick={() => setTab('log')}>Activity log</button>
      </div>

      {tab === 'log' && (
        <div className="card">
          <div className="cardhead"><div><h3>Activity log</h3><p className="muted">What HR and admin users did: approvals, removals, password resets, performance remarks, leave decisions and settings changes.</p></div>
            <select style={{ maxWidth: 220 }} value={who} onChange={e => setWho(e.target.value)}><option value="">Everyone</option>{actors.map(a => <option key={a}>{a}</option>)}</select></div>
          {shown.length === 0 ? <p className="muted">Nothing recorded yet.</p> : (
            <table>
              <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
              <tbody>{shown.map(l => (
                <tr key={l.id}><td>{new Date(l.created_at).toLocaleString('en-GB', { timeZone: company.timezone, dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{l.actor_name} <span className="tag">{l.actor_role}</span></td><td>{l.action}</td><td>{l.detail}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'team' && (
        <>
          <div className="card">
            <h3>Employee sign-up code</h3>
            <p className="muted">Employees need this company code and their own Employee ID to request an account. Nothing opens until you or HR approve.</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pill codepill">{company.join_code}</span>
              <button className="btn ghost" style={{ marginTop: 0 }} onClick={newCode}>Make a new code</button>
            </div>
          </div>
          {pending.length > 0 && (
            <div className="card">
              <h3>Waiting for approval ({pending.length})</h3>
              {pending.map(s => (
                <div className="reqrow" key={s.id}>
                  <div style={{ flex: 1, minWidth: 200 }}><b>{s.name || s.email}</b> {s.id_verified && <span className="tag ok">ID matched</span>}<div className="muted">{s.email}</div></div>
                  <select value={pick[s.id] ?? s.employee_id ?? ''} onChange={e => setPick({ ...pick, [s.id]: e.target.value })}>
                    <option value="">Which employee is this?</option>
                    {emps.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
                  </select>
                  <button className="btn sm" onClick={() => decide(s, 'approve')}>Approve</button>
                  <button className="btn ghost sm" onClick={() => decide(s, 'reject')}>Reject</button>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <h3>Add a staff user</h3>
            <div className="grid">
              <div><label>Name</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
              <div><label>Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
              <div><label>Role</label>
                <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{ROLES.slice(0, 4).map(([r]) => <option key={r}>{r}</option>)}</select></div>
              <div><label>Temporary password</label><PasswordInput value={f.password} onChange={v => setF({ ...f, password: v })} meter generate autoComplete="new-password" /></div>
            </div>
            <button className="btn" onClick={add}>Add user</button>
          </div>
          <div className="card">
            <h3>Team</h3>
            {rest.length === 0 && <p className="muted">No staff users yet.</p>}
            {rest.map(s => (
              <div key={s.id}>
                <div className="reqrow">
                  <div className="avatar sm">{s.avatar_url ? <img src={s.avatar_url} alt="" /> : (s.name || s.email)[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 180 }}><b>{s.name || s.email}</b><div className="muted">{s.email}</div></div>
                  <span className="tag">{s.role}</span>{s.status !== 'active' && <span className="tag warn">{s.status}</span>}
                  {s.employee_id && s.status === 'active' && (s.role === 'employee' || s.role === 'manager') && (
                    <button className="btn ghost sm" onClick={async () => { const o = await call('PATCH', '', { id: s.id, action: 'set_role', role: s.role === 'manager' ? 'employee' : 'manager' }); o.error ? toast(o.error, 'err') : (toast(s.role === 'manager' ? 'Now an employee' : 'Now a manager of their own team'), load()) }}>{s.role === 'manager' ? 'Make employee' : 'Make manager'}</button>
                  )}
                  {s.user_id && <button className="btn ghost sm" onClick={() => setReset({ id: s.id, pw: '' })}><KeyRound size={14} /> Reset password</button>}
                  <button className="btn ghost sm" onClick={async () => { if (confirm('Remove this user?')) { const o = await call('DELETE', '?id=' + s.id); o.error ? toast(o.error, 'err') : (toast('User removed'), load()) } }}>Remove</button>
                </div>
                {reset?.id === s.id && (
                  <div className="resetbox">
                    <label>New password for {s.name || s.email}</label>
                    <PasswordInput value={reset.pw} onChange={v => setReset({ id: s.id, pw: v })} meter generate autoComplete="new-password" />
                    <button className="btn sm" onClick={doReset}>Set password</button>
                    <button className="btn ghost sm" style={{ marginLeft: 8 }} onClick={() => setReset(null)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Roles</h3>
            {ROLES.map(([r, d]) => <div className="drow" key={r}><b>{r}</b><span>{d}</span></div>)}
          </div>
        </>
      )}
    </>
  )
}
