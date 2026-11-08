'use client'
import { useEffect, useRef, useState } from 'react'
import { sb } from '@/lib/supabase'
import Scanner from './Scanner'

export default function Attendance({ company }: { company: any }) {
  const [emps, setEmps] = useState<any[]>([])
  const [today, setToday] = useState<any[]>([])
  const [mode, setMode] = useState('qr')
  const [log, setLog] = useState<string[]>([])
  const last = useRef<Record<string, number>>({})
  const day = new Date().toLocaleDateString('en-CA', { timeZone: company.timezone })
  const tm = (iso: string) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: company.timezone, hour: '2-digit', minute: '2-digit' }) : '-')

  const loadToday = async () => {
    const { data } = await sb.from('attendance').select('*, employees(name)').eq('day', day).order('check_in', { ascending: false })
    setToday(data || [])
  }
  useEffect(() => {
    sb.from('employees').select('*').eq('active', true).then(({ data }) => setEmps(data || []))
    loadToday()
  }, [])

  async function send(emp: any) {
    if (Date.now() - (last.current[emp.id] || 0) < 8000) return
    last.current[emp.id] = Date.now()
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token },
      body: JSON.stringify({ employeeId: emp.id, method: mode })
    })
    const out = await res.json()
    setLog(l => [out.message || out.error, ...l].slice(0, 6))
    loadToday()
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Scan attendance</h3>
        <div className="grid">
          <div>
            <label>Method</label>
            <select value={mode} onChange={e => setMode(e.target.value)}>
              <option value="qr">QR code</option>
              {company.face_enabled && <option value="face">Face recognition</option>}
            </select>
          </div>
        </div>
        <p className="muted">For a fixed screen at the entrance, use Launch Kiosk at the top. Phone check-in with GPS works through each employee's personal link.</p>
        <Scanner key={mode} mode={mode} emps={emps} onHit={send} />
        {log.map((l, i) => <div key={i} className="ok">{l}</div>)}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Today ({day})</h3>
        {today.length === 0 && <p className="muted">No check-ins yet today.</p>}
        {today.length > 0 && (
          <table>
            <thead><tr><th>Employee</th><th>In</th><th>Out</th><th>Via</th></tr></thead>
            <tbody>
              {today.map(a => (
                <tr key={a.id}>
                  <td>{a.employees?.name} {a.late && <span className="tag">late</span>}</td>
                  <td>{tm(a.check_in)}</td><td>{tm(a.check_out)}</td><td>{a.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
