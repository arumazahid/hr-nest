'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import ExportBar from './ExportBar'
import PayComponents from './PayComponents'

export default function Payroll({ company }: { company: any }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [rows, setRows] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (m = month) => {
    const { data } = await sb.from('payroll').select('*, employees(name)').eq('month', m).order('created_at')
    setRows(data || [])
  }
  useEffect(() => { load() }, [month])

  async function call(method: string, body: any) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/payroll', {
      method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify(body)
    })
    return { res, out: await res.json() }
  }

  async function run() {
    setBusy(true); setMsg('')
    const { res, out } = await call('POST', { month })
    setMsg(res.ok ? `Payroll calculated for ${out.count} employee(s)` : out.error)
    setBusy(false); load()
  }

  async function adjust(r: any, bonus: string, overtime: string) {
    await call('PATCH', { id: r.id, bonus, overtime })
    load()
  }

  const total = rows.reduce((s, r) => s + Number(r.net), 0)
  const ded = (r: any) => Number(r.absent_deduction) + Number(r.leave_deduction) + Number(r.late_deduction)
  return (
    <>
    <PayComponents company={company} />
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Payroll</h3>
      <div className="grid">
        <div><label>Month</label><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
      </div>
      <button className="btn" disabled={busy} onClick={run}>{busy ? 'Calculating...' : 'Calculate payroll'}</button>
      <p className="muted">Calculating again refreshes attendance and leave deductions but keeps the bonus and overtime you entered.</p>
      {msg && <div className={msg.startsWith('Payroll') ? 'ok' : 'err'}>{msg}</div>}
      {rows.length === 0 && <p className="muted">No payroll for this month yet. Calculate it after adding employees.</p>}
      {rows.length > 0 && (
        <>
          <ExportBar name={`payroll-${month}`} rows={rows.map(r => ({
            Employee: r.employees?.name, Basic: r.basic, Allowances: r.allowances, Bonus: r.bonus, Overtime: r.overtime,
            Deductions: ded(r).toFixed(2), Tax: r.tax, Net: r.net
          }))} />
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Employee</th><th>Basic</th><th>Allowances</th><th>Bonus</th><th>Overtime</th><th>Deductions</th><th>Tax</th><th>Net</th><th></th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.employees?.name}</td><td>{r.basic}</td><td>{r.allowances}</td>
                    <td><input type="number" min={0} style={{ width: 90 }} defaultValue={r.bonus} key={r.id + 'b' + r.bonus}
                      onBlur={e => Number(e.target.value) !== Number(r.bonus) && adjust(r, e.target.value, r.overtime)} /></td>
                    <td><input type="number" min={0} style={{ width: 90 }} defaultValue={r.overtime} key={r.id + 'o' + r.overtime}
                      onBlur={e => Number(e.target.value) !== Number(r.overtime) && adjust(r, r.bonus, e.target.value)} /></td>
                    <td>{ded(r).toFixed(2)}</td><td>{r.tax}</td><td><b>{r.net}</b></td>
                    <td><a href={'/payslip/' + r.id} target="_blank">Payslip</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p><b>Total net: {total.toFixed(2)} {company.currency}</b></p>
        </>
      )}
    </div>
    </>
  )
}
