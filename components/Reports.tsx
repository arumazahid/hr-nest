'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { monthStats } from '@/lib/stats'
import ExportBar from './ExportBar'

function useStats(company: any, month: string) {
  const [stats, setStats] = useState<any[]>([])
  useEffect(() => {
    (async () => {
      const from = `${month}-01`
      const to = `${month}-31`
      const [e, a, l, h] = await Promise.all([
        sb.from('employees').select('*, departments(name)').eq('active', true).order('name'),
        sb.from('attendance').select('*').gte('day', from).lte('day', to),
        sb.from('leaves').select('*').gte('day', from).lte('day', to),
        sb.from('holidays').select('day').gte('day', from).lte('day', to)
      ])
      setStats(monthStats(company, month, e.data || [], a.data || [], l.data || [], h.data || []))
    })()
  }, [month])
  return stats
}

function EmployeeReport() {
  const [emps, setEmps] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [dept, setDept] = useState('')
  useEffect(() => {
    sb.from('employees').select('*, departments(name)').order('employee_code').then(({ data }) => setEmps(data || []))
    sb.from('departments').select('*').order('name').then(({ data }) => setDepts(data || []))
  }, [])
  const list = emps.filter(e => !dept || e.department_id === dept)
  const rows = list.map(e => ({
    'Employee ID': e.employee_code, Name: e.name, Department: e.departments?.name || '', Designation: e.job_title || '',
    'Joining date': e.joining_date || '', Phone: e.phone || '', Email: e.email || '', 'Monthly salary': e.monthly_salary
  }))
  return (
    <div className="card">
      <div className="noprint" style={{ maxWidth: 320 }}>
        <label>Department</label>
        <select value={dept} onChange={e => setDept(e.target.value)}>
          <option value="">All departments</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <ExportBar rows={rows} name="employee-report" />
      <h3 className="printonly">Employee report</h3>
      {rows.length === 0 ? <p className="muted">No employees found.</p> : (
        <table>
          <thead><tr>{Object.keys(rows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody>
        </table>
      )}
    </div>
  )
}

function Analytics({ company, month }: { company: any; month: string }) {
  const stats = useStats(company, month)
  const rows = stats.map(s => ({
    'Employee ID': s.emp.employee_code, Name: s.emp.name, Department: s.emp.departments?.name || '', 'Working days': s.workDays,
    Present: s.present, Late: s.late, Absent: s.absent, 'Leave days': s.leaveDays, 'Working hours': s.hours, 'Attendance %': s.attPct
  }))
  const byDept: Record<string, number[]> = {}
  stats.forEach(s => (byDept[s.emp.departments?.name || 'No department'] ||= []).push(s.attPct))
  return (
    <>
      {Object.keys(byDept).length > 0 && (
        <div className="card">
          <b>Average attendance by department</b>
          {Object.entries(byDept).map(([name, v]) => {
            const avg = Math.round(v.reduce((a, b) => a + b, 0) / v.length)
            return (
              <div key={name} style={{ margin: '10px 0' }}>
                <div className="muted">{name}: {avg}%</div>
                <div style={{ background: '#E5E7EB', borderRadius: 8, height: 10 }}><div style={{ width: avg + '%', background: '#FACC15', height: 10, borderRadius: 8 }} /></div>
              </div>
            )
          })}
        </div>
      )}
      <div className="card">
        <ExportBar rows={rows} name={`attendance-analytics-${month}`} />
        <h3 className="printonly">Attendance analytics {month}</h3>
        {rows.length === 0 ? <p className="muted">No data for this month.</p> : (
          <table>
            <thead><tr>{Object.keys(rows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  )
}

function Performance({ company, month, canEdit }: { company: any; month: string; canEdit: boolean }) {
  const stats = useStats(company, month)
  const [perf, setPerf] = useState<Record<string, any>>({})
  useEffect(() => {
    sb.from('performance').select('*').eq('month', month).then(({ data }) => {
      const m: Record<string, any> = {}
      ;(data || []).forEach((p: any) => (m[p.employee_id] = p))
      setPerf(m)
    })
  }, [month])

  async function save(empId: string, patch: any) {
    const row = { company_id: company.id, employee_id: empId, month, rating: perf[empId]?.rating ?? null, notes: perf[empId]?.notes ?? '', ...patch }
    setPerf({ ...perf, [empId]: row })
    await sb.from('performance').upsert(row, { onConflict: 'employee_id,month' })
  }

  const rows = stats.map(s => ({
    'Employee ID': s.emp.employee_code, Name: s.emp.name, 'Attendance %': s.attPct, 'Punctuality %': s.punct, 'Auto score': s.score,
    'HR rating (1-5)': perf[s.emp.id]?.rating ?? '', Notes: perf[s.emp.id]?.notes ?? ''
  }))
  return (
    <div className="card">
      <p className="muted">Auto score = 60% attendance and 40% punctuality (on-time arrivals). HR adds a rating from 1 to 5 and notes.</p>
      <ExportBar rows={rows} name={`performance-${month}`} />
      <h3 className="printonly">Performance report {month}</h3>
      {stats.length === 0 ? <p className="muted">No employees yet.</p> : (
        <table>
          <thead><tr><th>Employee</th><th>Attendance</th><th>Punctuality</th><th>Auto score</th><th>HR rating</th><th>Notes</th></tr></thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.emp.id}>
                <td>{s.emp.name} <span className="muted">{s.emp.employee_code}</span></td>
                <td>{s.attPct}%</td><td>{s.punct}%</td><td><b>{s.score}</b></td>
                <td>
                  <select disabled={!canEdit} value={perf[s.emp.id]?.rating ?? ''} style={{ width: 80 }} onChange={e => save(s.emp.id, { rating: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-</option>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
                  </select>
                </td>
                <td><input disabled={!canEdit} defaultValue={perf[s.emp.id]?.notes ?? ''} key={month + s.emp.id + (perf[s.emp.id]?.id || '')} onBlur={e => save(s.emp.id, { notes: e.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Reports({ company, canEdit }: { company: any; canEdit: boolean }) {
  const [view, setView] = useState('employees')
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA', { timeZone: company.timezone }).slice(0, 7))
  return (
    <>
      <div className="tabs noprint">
        {[['employees', 'Employee report'], ['analytics', 'Attendance analytics'], ['performance', 'Performance']].map(([k, l]) => (
          <button key={k} className={'tab' + (view === k ? ' on' : '')} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>
      {view !== 'employees' && (
        <div className="noprint" style={{ maxWidth: 240, marginBottom: 14 }}>
          <label>Month</label><input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      )}
      {view === 'employees' && <EmployeeReport />}
      {view === 'analytics' && <Analytics company={company} month={month} />}
      {view === 'performance' && <Performance company={company} month={month} canEdit={canEdit} />}
    </>
  )
}
