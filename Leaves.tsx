'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { balance } from '@/lib/leave'

const TYPES = ['annual', 'sick', 'unpaid']
const blank = { employee_id: '', day: '', leave_type: 'annual', type: 'full', reason: '' }

export default function Leaves({ company }: { company: any }) {
  const [emps, setEmps] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [f, setF] = useState<any>(blank)
  const [msg, setMsg] = useState('')
  const year = new Date().toLocaleDateString('en-CA', { timeZone: company.timezone }).slice(0, 4)

  const load = async () => {
    const { data } = await sb.from('leaves').select('*, employees(name, employee_code)').order('day', { ascending: false }).limit(400)
    setLeaves(data || [])
    const { data: e } = await sb.from('employees').select('id, name, employee_code').eq('active', true).order('name')
    setEmps(e || [])
  }
  useEffect(() => { load() }, [])

  const decide = async (id: string, status: string) => {
    const { data } = await sb.auth.getSession()
    await fetch('/api/leave', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify({ id, status }) })
    load()
  }

  async function add() {
    if (!f.employee_id || !f.day) return setMsg('Choose an employee and a date')
    const { error } = await sb.from('leaves').insert({ company_id: company.id, ...f, status: 'approved' })
    if (error) return setMsg(error.message.includes('duplicate') ? 'Leave already recorded for that date' : error.message)
    setF({ ...f, day: '', reason: '' }); setMsg(''); load()
  }

  const pending = leaves.filter(l => l.status === 'pending')
  const badge: Record<string, string> = { approved: '#16a34a', pending: '#d97706', rejected: '#dc2626' }
  const desc = (l: any) => `${l.day} · ${l.leave_type} · ${l.type} day${l.reason ? ' · ' + l.reason : ''}`

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Leave requests waiting ({pending.length})</h3>
        {pending.length === 0 && <p className="muted">No pending requests. Employees send requests from their personal link (Employees page).</p>}
        {pending.map(l => (
          <div className="drow" key={l.id}>
            <span><b>{l.employees?.name}</b> · {desc(l)}</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ marginTop: 0, padding: '4px 14px' }} onClick={() => decide(l.id, 'approved')}>Approve</button>
              <button className="btn ghost" style={{ marginTop: 0, padding: '4px 14px' }} onClick={() => decide(l.id, 'rejected')}>Reject</button>
            </span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Leave balance for {year}</h3>
        <p className="muted">Each employee gets {company.annual_leaves} annual and {company.sick_leaves} sick days a year. Leave beyond the balance, and unpaid leave, is deducted from salary.</p>
        {emps.length === 0 ? <p className="muted">No employees yet.</p> : (
          <table>
            <thead><tr><th>Employee</th><th>Annual left</th><th>Sick left</th><th>Unpaid taken</th></tr></thead>
            <tbody>
              {emps.map(e => {
                const b = balance(company, leaves.filter(l => l.employee_id === e.id), year)
                return (
                  <tr key={e.id}>
                    <td>{e.name} <span className="muted">{e.employee_code}</span></td>
                    <td>{b.annual.quota - b.annual.used} of {b.annual.quota}</td>
                    <td>{b.sick.quota - b.sick.used} of {b.sick.quota}</td>
                    <td>{b.unpaid}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Record leave</h3>
        <div className="grid">
          <div>
            <label>Employee</label>
            <select value={f.employee_id} onChange={e => setF({ ...f, employee_id: e.target.value })}>
              <option value="">Choose</option>
              {emps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label>Date</label><input type="date" value={f.day} onChange={e => setF({ ...f, day: e.target.value })} /></div>
          <div>
            <label>Leave type</label>
            <select value={f.leave_type} onChange={e => setF({ ...f, leave_type: e.target.value })}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          </div>
          <div>
            <label>Duration</label>
            <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="full">Full day</option><option value="half">Half day</option></select>
          </div>
        </div>
        <label>Reason</label>
        <input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} />
        {msg && <div className="err">{msg}</div>}
        <button className="btn" onClick={add}>Save as approved</button>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>History</h3>
        {leaves.filter(l => l.status !== 'pending').slice(0, 40).map(l => (
          <div className="drow" key={l.id}>
            <span><b>{l.employees?.name}</b> · {desc(l)}</span>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="badge" style={{ background: badge[l.status] }}>{l.status}</span>
              <span style={{ cursor: 'pointer' }} onClick={async () => { await sb.from('leaves').delete().eq('id', l.id); load() }}>Remove</span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
