'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'

export default function Departments({ company }: { company: any }) {
  const [depts, setDepts] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [head, setHead] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await sb.from('departments').select('*').order('name')
    setDepts(data || [])
    const { data: emps } = await sb.from('employees').select('department_id').eq('active', true)
    const c: Record<string, number> = {}
    ;(emps || []).forEach((e: any) => e.department_id && (c[e.department_id] = (c[e.department_id] || 0) + 1))
    setCounts(c)
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!name.trim()) return setMsg('Enter a department name')
    const { error } = await sb.from('departments').insert({ company_id: company.id, name: name.trim(), head })
    if (error) return setMsg(error.message.includes('duplicate') ? 'This department already exists' : error.message)
    setName(''); setHead(''); setMsg(''); load()
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add department</h3>
        <div className="grid">
          <div><label>Department name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label>Department head</label><input value={head} onChange={e => setHead(e.target.value)} /></div>
        </div>
        {msg && <div className="err">{msg}</div>}
        <button className="btn" onClick={add}>Save department</button>
      </div>
      {depts.length === 0 && <p className="muted">No departments yet.</p>}
      {depts.map(d => (
        <div className="row" key={d.id}>
          <div style={{ flex: 1 }}>
            <b>{d.name}</b>
            <div className="muted">Head: {d.head || '-'} · {counts[d.id] || 0} employee(s)</div>
          </div>
          <button className="btn ghost" style={{ marginTop: 0 }} onClick={async () => {
            if (confirm('Delete this department? Employees stay but lose their department.')) { await sb.from('departments').delete().eq('id', d.id); load() }
          }}>Delete</button>
        </div>
      ))}
    </>
  )
}
