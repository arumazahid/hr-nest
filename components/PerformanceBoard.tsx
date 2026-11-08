'use client'
import { useEffect, useState } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { toast } from './Toast'
import { logActivity } from '@/lib/activity'

const shift = (m: string, n: number) => {
  const d = new Date(m + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7)
}
const label = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function PerformanceBoard({ company, canEdit }: { company: any; canEdit: boolean }) {
  const now = new Date().toLocaleDateString('en-CA', { timeZone: company.timezone }).slice(0, 7)
  const [month, setMonth] = useState(now)
  const [emps, setEmps] = useState<any[]>([])
  const [perf, setPerf] = useState<Record<string, any>>({})
  const [draft, setDraft] = useState<Record<string, string>>({})

  useEffect(() => { sb.from('employees').select('id, name, employee_code, job_title, photo_url').eq('active', true).order('name').then(({ data }) => setEmps(data || [])) }, [])
  useEffect(() => {
    sb.from('performance').select('*').eq('month', month).then(({ data }) => {
      const m: Record<string, any> = {}; (data || []).forEach((p: any) => (m[p.employee_id] = p)); setPerf(m); setDraft({})
    })
  }, [month])

  async function save(e: any, patch: any) {
    const prev = perf[e.id] || {}
    const row = { company_id: company.id, employee_id: e.id, month, rating: prev.rating ?? null, notes: prev.notes ?? '', ...patch }
    const { error } = await sb.from('performance').upsert(row, { onConflict: 'employee_id,month' })
    if (error) return toast(error.message, 'err')
    setPerf({ ...perf, [e.id]: row })
    toast(`Remarks saved for ${e.name}`)
    logActivity(company.id, 'Performance remark', `${e.name} · ${month}${patch.rating ? ' · rating ' + patch.rating : ''}`)
  }

  const rated = emps.filter(e => perf[e.id]?.rating).length
  const avg = rated ? (emps.reduce((s, e) => s + (perf[e.id]?.rating || 0), 0) / rated).toFixed(1) : '-'

  return (
    <div className="card">
      <div className="cardhead">
        <div>
          <h3>Performance and HR remarks</h3>
          <p className="muted">Rate each employee from 1 to 5 and leave a remark. Employees see their own remarks in their portal.</p>
        </div>
        <div className="seg">
          <button onClick={() => setMonth(shift(month, -1))}><ChevronLeft size={16} /></button>
          <span>{label(month)}</span>
          <button disabled={month >= now} onClick={() => setMonth(shift(month, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="pillrow">
        <span className="pill">{rated} of {emps.length} rated</span>
        <span className="pill">Average {avg}</span>
      </div>
      {emps.length === 0 && <p className="muted">Add employees first and they will show up here.</p>}
      <div className="perfgrid">
        {emps.map(e => {
          const p = perf[e.id] || {}
          return (
            <div className="perfrow" key={e.id}>
              <div className="perfwho">
                <div className="avatar sm">{e.photo_url ? <img src={e.photo_url} alt="" /> : e.name[0]}</div>
                <div><b>{e.name}</b><div className="muted">{e.job_title || e.employee_code}</div></div>
              </div>
              <div className="stars">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} disabled={!canEdit} title={n + ' / 5'} className={(p.rating || 0) >= n ? 'on' : ''}
                    onClick={() => save(e, { rating: p.rating === n ? null : n })}><Star size={18} /></button>
                ))}
              </div>
              <input className="remark" disabled={!canEdit} placeholder={canEdit ? 'Write a remark for this month' : 'No remark'}
                value={draft[e.id] ?? p.notes ?? ''} onChange={x => setDraft({ ...draft, [e.id]: x.target.value })}
                onBlur={() => draft[e.id] !== undefined && draft[e.id] !== (p.notes ?? '') && save(e, { notes: draft[e.id] })}
                onKeyDown={x => x.key === 'Enter' && (x.target as HTMLInputElement).blur()} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
