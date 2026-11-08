'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'

export default function Holidays({ company }: { company: any }) {
  const [rows, setRows] = useState<any[]>([])
  const [day, setDay] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await sb.from('holidays').select('*').order('day')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!day || !name.trim()) return setMsg('Choose a date and enter a name')
    const { error } = await sb.from('holidays').insert({ company_id: company.id, day, name: name.trim() })
    if (error) return setMsg(error.message.includes('duplicate') ? 'A holiday already exists on that date' : error.message)
    setDay(''); setName(''); setMsg(''); load()
  }

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Company holidays</h3>
        <p className="muted">Holidays are not counted as working days in absences and payroll.</p>
        <div className="grid">
          <div><label>Date</label><input type="date" value={day} onChange={e => setDay(e.target.value)} /></div>
          <div><label>Holiday name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
        </div>
        {msg && <div className="err">{msg}</div>}
        <button className="btn" onClick={add}>Add holiday</button>
      </div>
      {rows.length === 0 && <p className="muted">No holidays added yet.</p>}
      {rows.map(h => (
        <div className="row" key={h.id} style={{ opacity: h.day < today ? 0.55 : 1 }}>
          <div style={{ flex: 1 }}><b>{h.name}</b><div className="muted">{fmt(h.day)}</div></div>
          <button className="btn ghost" style={{ marginTop: 0 }} onClick={async () => { await sb.from('holidays').delete().eq('id', h.id); load() }}>Remove</button>
        </div>
      ))}
    </>
  )
}
