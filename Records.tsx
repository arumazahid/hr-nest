'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import ExportBar from './ExportBar'

export default function Records({ company }: { company: any }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: company.timezone })
  const [from, setFrom] = useState(today.slice(0, 8) + '01')
  const [to, setTo] = useState(today)
  const [emp, setEmp] = useState('')
  const [emps, setEmps] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const tm = (iso: string) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: company.timezone, hour: '2-digit', minute: '2-digit' }) : '-')
  const hrs = (a: any) => (a.check_out ? ((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000).toFixed(2) : '-')

  useEffect(() => { sb.from('employees').select('id, name').order('name').then(({ data }) => setEmps(data || [])) }, [])
  useEffect(() => {
    let q = sb.from('attendance').select('*, employees(name, employee_code)').gte('day', from).lte('day', to).order('day', { ascending: false }).limit(1000)
    if (emp) q = q.eq('employee_id', emp)
    q.then(({ data }) => setRows(data || []))
  }, [from, to, emp])

  const total = rows.reduce((s, a) => s + (a.check_out ? (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000 : 0), 0)
  const data = rows.map(a => ({
    Date: a.day, 'Employee ID': a.employees?.employee_code, Employee: a.employees?.name, 'Check in': tm(a.check_in),
    'Check out': tm(a.check_out), 'Working hours': hrs(a), Status: a.late ? 'Late' : 'On time', Method: a.method
  }))

  return (
    <>
      <div className="card noprint">
        <div className="grid">
          <div><label>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><label>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div>
            <label>Employee</label>
            <select value={emp} onChange={e => setEmp(e.target.value)}>
              <option value="">All employees</option>
              {emps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
        <ExportBar rows={data} name={`attendance-${from}-to-${to}`} />
      </div>
      <div className="card">
        <h3 className="printonly">{company.name}: attendance {from} to {to}</h3>
        <p className="muted">{rows.length} record(s) · {rows.filter(a => a.late).length} late · {total.toFixed(1)} working hours in total</p>
        {rows.length === 0 ? <p className="muted">No records for this period.</p> : (
          <table>
            <thead><tr><th>Date</th><th>Employee</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th><th>Via</th></tr></thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id}>
                  <td>{a.day}</td><td>{a.employees?.name} <span className="muted">{a.employees?.employee_code}</span></td>
                  <td>{tm(a.check_in)}</td><td>{tm(a.check_out)}</td><td>{hrs(a)}</td>
                  <td>{a.late ? <span className="tag">Late</span> : 'On time'}</td><td>{a.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
