'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'

const blank = { name: '', kind: 'earning', calc: 'percent', value: '' }

export default function PayComponents({ company }: { company: any }) {
  const [rows, setRows] = useState<any[]>([])
  const [f, setF] = useState<any>(blank)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await sb.from('pay_components').select('*').order('created_at')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!f.name.trim() || f.value === '' || Number(f.value) < 0) return setMsg('Enter a name and a value of 0 or more')
    const { error } = await sb.from('pay_components').insert({ company_id: company.id, name: f.name.trim(), kind: f.kind, calc: f.calc, value: Number(f.value) })
    if (error) return setMsg(error.message)
    setF(blank); setMsg(''); load()
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Salary structure</h3>
      <p className="muted">Add the allowances and deductions your company uses (for example House Rent, Medical, Provident Fund). They apply to every employee and appear on the payslip. "Percent" means a percentage of the basic salary. Extra allowances and tax for one person are set in Employees.</p>
      <div className="grid">
        <div><label>Name</label><input value={f.name} placeholder="House Rent Allowance" onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div>
          <label>Type</label>
          <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="earning">Earning (adds to salary)</option><option value="deduction">Deduction (subtracts)</option></select>
        </div>
        <div>
          <label>Calculated as</label>
          <select value={f.calc} onChange={e => setF({ ...f, calc: e.target.value })}><option value="percent">Percent of basic salary</option><option value="fixed">Fixed amount</option></select>
        </div>
        <div><label>{f.calc === 'percent' ? 'Percent (%)' : `Amount (${company.currency})`}</label><input type="number" min={0} value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></div>
      </div>
      {msg && <div className="err">{msg}</div>}
      <button className="btn" onClick={add}>Add to salary structure</button>
      {rows.map(r => (
        <div className="drow" key={r.id}>
          <span><b>{r.name}</b> · {r.kind} · {r.calc === 'percent' ? `${r.value}% of basic` : `${r.value} ${company.currency}`}</span>
          <span style={{ cursor: 'pointer' }} onClick={async () => { await sb.from('pay_components').delete().eq('id', r.id); load() }}>Remove</span>
        </div>
      ))}
    </div>
  )
}
