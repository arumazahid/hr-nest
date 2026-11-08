'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'

const blank = { title: '', description: '', skills: '', min_experience: 0, education: 'Any' }

export default function Jobs({ company }: { company: any }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [f, setF] = useState<any>(blank)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await sb.from('jobs').select('*').order('created_at', { ascending: false })
    setJobs(data || [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!f.title.trim()) return setMsg('Enter a job title')
    const required_skills = f.skills.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    const { error } = await sb.from('jobs').insert({
      company_id: company.id, title: f.title, description: f.description,
      required_skills, min_experience: Number(f.min_experience) || 0, education: f.education
    })
    if (error) return setMsg(error.message)
    setF(blank); setMsg(''); load()
  }

  const toggle = async (j: any) => {
    await sb.from('jobs').update({ status: j.status === 'open' ? 'closed' : 'open' }).eq('id', j.id)
    load()
  }
  const remove = async (j: any) => {
    if (confirm('Delete this job and its scores?')) { await sb.from('jobs').delete().eq('id', j.id); load() }
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>New job</h3>
        <div className="grid">
          <div><label>Job title</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></div>
          <div><label>Required skills (comma separated)</label><input value={f.skills} onChange={e => setF({ ...f, skills: e.target.value })} /></div>
          <div><label>Minimum years of experience</label><input type="number" min={0} value={f.min_experience} onChange={e => setF({ ...f, min_experience: e.target.value })} /></div>
          <div>
            <label>Education</label>
            <select value={f.education} onChange={e => setF({ ...f, education: e.target.value })}>
              {['Any', 'Diploma', "Bachelor's", "Master's", 'PhD'].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <label>Description</label>
        <textarea rows={4} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
        {msg && <div className="err">{msg}</div>}
        <button className="btn" onClick={save}>Save job</button>
      </div>
      {jobs.length === 0 && <p className="muted">No jobs yet. Add your first job above, then upload CVs.</p>}
      {jobs.map(j => (
        <div className="row" key={j.id}>
          <div style={{ flex: 1 }}>
            <b>{j.title}</b> <span className="tag">{j.status}</span>
            <div className="muted">{j.min_experience} yrs · {j.education} · {j.required_skills.join(', ') || 'no skills listed'}</div>
            <div className="muted">Apply link: {location.origin}/apply/{j.slug}</div>
          </div>
          <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => toggle(j)}>{j.status === 'open' ? 'Close' : 'Reopen'}</button>
          <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => remove(j)}>Delete</button>
        </div>
      ))}
    </>
  )
}
