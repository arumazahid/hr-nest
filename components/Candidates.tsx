'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { zoned } from '@/lib/time'
import MailComposer from './MailComposer'
import MailTemplates from './MailTemplates'
import { buildVars, fillTemplate, DEFAULTS } from '@/lib/templates'

const COLORS: Record<string, string> = { 'Perfect Match': '#16a34a', 'Good Match': '#2563eb', Average: '#f97316', 'Bad Match': '#dc2626' }
const STATUS = ['new', 'shortlisted', 'interview', 'selected', 'rejected']
const initials = (n: string) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

export default function Candidates({ company }: { company: any }) {
  const [view, setView] = useState('rank')
  const [jobs, setJobs] = useState<any[]>([])
  const [jobId, setJobId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [link, setLink] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [all, setAll] = useState<any[]>([])
  const [best, setBest] = useState<Record<string, any>>({})
  const [open, setOpen] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [sched, setSched] = useState<any>(null)
  const [iv, setIv] = useState<any>({ date: '', time: '10:00', mode: 'in-person', place: '', interviewer: '', notes: '' })
  const [ivMsg, setIvMsg] = useState('')
  const [templates, setTemplates] = useState<Record<string, any>>({})
  const [compose, setCompose] = useState<any>(null)
  const [ivMail, setIvMail] = useState({ subject: '', body: '' })
  const [ivEdited, setIvEdited] = useState(false)

  async function loadRows(id: string) {
    if (!id) return setRows([])
    const { data } = await sb.from('candidate_scores')
      .select('id, score, level, details, candidates(id, name, email, phone, years, applied_job_id, source)')
      .eq('job_id', id).order('score', { ascending: false })
    setRows(data || [])
  }
  async function loadAll() {
    const { data } = await sb.from('candidates').select('id, name, email, phone, source, status, created_at, applied_job_id, jobs(title)').order('created_at', { ascending: false }).limit(500)
    setAll(data || [])
    const { data: sc } = await sb.from('candidate_scores').select('candidate_id, score, jobs(title)').order('score', { ascending: false }).limit(3000)
    const m: Record<string, any> = {}
    ;(sc || []).forEach((s: any) => { if (!m[s.candidate_id]) m[s.candidate_id] = s })
    setBest(m)
  }

  useEffect(() => {
    sb.from('jobs').select('id, title, status').order('created_at', { ascending: false }).then(({ data }) => {
      setJobs(data || [])
      if (data?.length) setJobId(data[0].id)
    })
    loadAll()
  }, [])
  useEffect(() => { loadRows(jobId) }, [jobId])
  const loadTemplates = () => sb.from('mail_templates').select('kind, subject, body').then(({ data }) => {
    const m: Record<string, any> = {}; (data || []).forEach((t: any) => (m[t.kind] = t)); setTemplates(m)
  })
  useEffect(() => { loadTemplates() }, [])
  const positionOf = (c: any) => jobs.find(j => j.id === (c?.applied_job_id || jobId))?.title
  const openSched = (c: any) => { setIvEdited(false); setSched(c); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  useEffect(() => {
    if (!sched || ivEdited) return
    setIvMail(fillTemplate(templates.interview || DEFAULTS.interview, buildVars(company, sched, { position: positionOf(sched), ...iv })))
  }, [sched, iv, templates, jobs, jobId])
  const waLink = (phone: string) => {
    let d = String(phone || '').replace(/\D/g, '')
    if (d.startsWith('0') && company.timezone === 'Asia/Karachi') d = '92' + d.slice(1)
    return d ? 'https://wa.me/' + d : ''
  }
  const quick = (c: any) => (
    <>
      <button className="btn" style={{ marginTop: 0 }} onClick={() => { setCompose({ c, kind: 'selected' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Select</button>
      <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => { setCompose({ c, kind: 'rejected' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Reject</button>
      {c.phone && <a className="btn ghost sm" style={{ textDecoration: 'none' }} href={'tel:' + c.phone}>Call</a>}
      {waLink(c.phone) && <a className="btn ghost sm" style={{ textDecoration: 'none' }} href={waLink(c.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
    </>
  )

  async function token() { return (await sb.auth.getSession()).data.session?.access_token }

  // One CV per request: a single request with many CVs hits the host's 4.5 MB upload limit and 60 second limit.
  async function analyze() {
    if (!files.length) return setMsg('Choose at least one CV')
    setBusy(true); setMsg('')
    const tk = await token()
    const done: any[] = [], bad: string[] = []
    for (let i = 0; i < files.length; i++) {
      setMsg(`Reading CV ${i + 1} of ${files.length}: ${files[i].name}`)
      try {
        const form = new FormData()
        form.append('files', files[i]); form.append('jobId', jobId)
        const res = await fetch('/api/cv', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body: form })
        const out = await res.json().catch(() => ({ error: 'File too large or the server timed out' }))
        if (!res.ok) bad.push(`${files[i].name}: ${out.error}`)
        else out.results.forEach((r: any) => (r.error ? bad.push(`${r.file}: ${r.error}`) : done.push(r)))
      } catch { bad.push(`${files[i].name}: network problem, try this one again`) }
    }
    setMsg(`${done.length} of ${files.length} CV(s) scored against all open jobs${done.some(r => r.updated) ? ' (an existing candidate with the same email was updated)' : ''}.${bad.length ? ' Problems: ' + bad.join(' | ') : ''}`)
    setFiles([]); loadRows(jobId); loadAll()
    setBusy(false)
  }

  async function addLink() {
    if (!link.trim()) return setMsg('Paste a link first')
    setBusy(true); setMsg('')
    const res = await fetch('/api/cv-link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify({ url: link, jobId }) })
    const out = await res.json()
    setMsg(res.ok ? 'Link read and scored against all open jobs' : out.error)
    if (res.ok) { setLink(''); loadRows(jobId); loadAll() }
    setBusy(false)
  }

  async function viewCv(id: string) {
    const res = await fetch('/api/cv-file?id=' + id, { headers: { Authorization: 'Bearer ' + await token() } })
    const out = await res.json()
    out.url ? window.open(out.url, '_blank') : alert(out.error)
  }

  async function schedule() {
    if (!iv.date) return setIvMsg('Choose a date')
    const res = await fetch('/api/interview', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() },
      body: JSON.stringify({ candidateId: sched.id, jobId: sched.applied_job_id || jobId, scheduledAt: zoned(iv.date, iv.time, company.timezone).toISOString(), mode: iv.mode, place: iv.place, interviewer: iv.interviewer, notes: iv.notes, subject: ivMail.subject, body: ivMail.body })
    })
    const out = await res.json()
    if (!res.ok) return setIvMsg(out.error)
    setSched(null); setIvMsg(''); setMsg(`Interview scheduled for ${sched.name}. ${out.emailed ? 'Invitation email sent.' : 'The invitation email was NOT sent: ' + (out.reason || 'unknown reason') + '. You can resend it from the Interviews page once this is fixed.'}`)
    loadAll()
  }

  const list = all.filter(c => (!st || c.status === st) && (c.name + ' ' + (c.email || '')).toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <div className="tabs">
        <button className={'tab' + (view === 'rank' ? ' on' : '')} onClick={() => setView('rank')}>Rankings</button>
        <button className={'tab' + (view === 'all' ? ' on' : '')} onClick={() => setView('all')}>All candidates ({all.length})</button>
        <button className={'tab' + (view === 'templates' ? ' on' : '')} onClick={() => setView('templates')}>Email templates</button>
      </div>
      {compose && <MailComposer company={company} cand={compose.c} kind={compose.kind} position={positionOf(compose.c)} templates={templates}
        onClose={() => setCompose(null)} onDone={() => { setCompose(null); loadAll(); loadRows(jobId) }} />}
      {view === 'templates' && <MailTemplates company={company} templates={templates} onSaved={loadTemplates} />}
      {sched && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Schedule interview: {sched.name}</h3>
          <div className="grid">
            <div><label>Date</label><input type="date" value={iv.date} onChange={e => setIv({ ...iv, date: e.target.value })} /></div>
            <div><label>Time</label><input type="time" value={iv.time} onChange={e => setIv({ ...iv, time: e.target.value })} /></div>
            <div><label>Type</label><select value={iv.mode} onChange={e => setIv({ ...iv, mode: e.target.value })}><option value="in-person">In person</option><option value="online">Online</option><option value="phone">Phone</option></select></div>
            <div><label>Place or meeting link</label><input value={iv.place} onChange={e => setIv({ ...iv, place: e.target.value })} /></div>
            <div><label>Interviewer</label><input value={iv.interviewer} onChange={e => setIv({ ...iv, interviewer: e.target.value })} /></div>
            <div><label>Notes for the candidate</label><input value={iv.notes} onChange={e => setIv({ ...iv, notes: e.target.value })} /></div>
          </div>
          <label>Email the candidate will receive (you can edit it)</label>
          <input value={ivMail.subject} onChange={e => { setIvEdited(true); setIvMail({ ...ivMail, subject: e.target.value }) }} />
          <textarea rows={12} value={ivMail.body} onChange={e => { setIvEdited(true); setIvMail({ ...ivMail, body: e.target.value }) }} />
          {ivMsg && <div className="err">{ivMsg}</div>}
          <button className="btn" onClick={schedule}>Schedule and email</button>
          <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => setSched(null)}>Cancel</button>
        </div>
      )}
      {view === 'rank' && (
        <>
          <div className="card">
            <div className="grid">
              <div><label>CVs are for this job</label>
                <select value={jobId} onChange={e => setJobId(e.target.value)}>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
              <div><label>Upload CVs (PDF, DOCX or image)</label>
                <input type="file" multiple accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={e => setFiles(Array.from(e.target.files || []))} /></div>
            </div>
            <button className="btn" disabled={busy} onClick={analyze}>{busy ? 'Working...' : files.length > 1 ? `Score ${files.length} CVs` : 'Score CVs'}</button>
            <label>Or paste a link (portfolio, online CV, or a PDF link)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input style={{ flex: 1, minWidth: 220 }} placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
              <button className="btn ghost" style={{ marginTop: 0 }} disabled={busy} onClick={addLink}>Read link</button>
            </div>
            <p className="muted">Every CV is scored against all your open jobs. Pages that need JavaScript or a login (like LinkedIn) cannot be read.</p>
            {msg && <div className={msg.includes('scored') || msg.includes('scheduled') ? 'ok' : 'err'}>{msg}</div>}
          </div>
          {jobs.length === 0 && <p className="muted">Add a job in the Jobs page first.</p>}
          {jobId && rows.length === 0 && jobs.length > 0 && <p className="muted">No CVs scored for this job yet.</p>}
          {rows.map(r => {
            const c = COLORS[r.level]
            const other = r.candidates.applied_job_id && r.candidates.applied_job_id !== jobId
            return (
              <div key={r.id}>
                <div className="row" style={{ cursor: 'pointer', flexWrap: 'wrap' }} onClick={() => setOpen(open === r.id ? '' : r.id)}>
                  <div className="avatar">{initials(r.candidates.name)}</div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <b>{r.candidates.name}</b> {other && <span className="tag">Applied for another job</span>} <span className="muted">via {r.candidates.source}</span>
                    <div className="muted">{r.candidates.years} yrs · {r.candidates.email || 'no email'}</div>
                  </div>
                  <span className="badge" style={{ background: c }}>{r.level}</span>
                  <div className="ring" style={{ background: `conic-gradient(${c} ${r.score * 3.6}deg, #E5E7EB 0)` }}><div>{Math.round(r.score)}</div></div>
                </div>
                {open === r.id && (
                  <>
                    <div className="grid" style={{ marginBottom: 10 }}>
                      <div className="card"><b style={{ color: '#16a34a' }}>Matches</b>{r.details.match.map((m: string[]) => <div className="drow" key={m[0]}><b>{m[0]}</b><span>{m[1]}</span></div>)}</div>
                      <div className="card"><b style={{ color: '#dc2626' }}>Gaps</b>{r.details.miss.map((m: string[]) => <div className="drow" key={m[0] + m[1]}><b>{m[0]}</b><span>{m[1]}</span></div>)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => viewCv(r.candidates.id)}>View CV</button>
                      <button className="btn" style={{ marginTop: 0 }} onClick={() => openSched({ ...r.candidates })}>Schedule interview</button>
                      {quick(r.candidates)}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </>
      )}
      {view === 'all' && (
        <div className="card">
          <div className="grid">
            <input placeholder="Search by name or email" value={q} onChange={e => setQ(e.target.value)} />
            <select value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option>{STATUS.map(s => <option key={s}>{s}</option>)}</select>
          </div>
          <p className="muted">Every CV you have ever added is kept here.</p>
          {list.length === 0 && <p className="muted">No candidates found.</p>}
          <div style={{ overflowX: 'auto' }}>
            {list.length > 0 && (
              <table>
                <thead><tr><th>Candidate</th><th>Added</th><th>Best match</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {list.map(c => (
                    <tr key={c.id}>
                      <td><b>{c.name}</b><div className="muted">{c.email || 'no email'} · via {c.source}</div></td>
                      <td>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                      <td>{best[c.id] ? `${best[c.id].jobs?.title}: ${Math.round(best[c.id].score)}` : '-'}</td>
                      <td>
                        <select style={{ width: 130 }} value={c.status} onChange={async e => { await sb.from('candidates').update({ status: e.target.value }).eq('id', c.id); loadAll() }}>
                          {STATUS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <a style={{ cursor: 'pointer' }} onClick={() => viewCv(c.id)}>View CV</a> · <a style={{ cursor: 'pointer' }} onClick={() => openSched(c)}>Interview</a> · <a style={{ cursor: 'pointer' }} onClick={() => { setCompose({ c, kind: 'selected' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Select</a> · <a style={{ cursor: 'pointer' }} onClick={() => { setCompose({ c, kind: 'rejected' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Reject</a> · <a style={{ cursor: 'pointer', color: '#dc2626' }} onClick={async () => { if (confirm('Delete this candidate?')) { await sb.from('candidates').delete().eq('id', c.id); loadAll(); loadRows(jobId) } }}>Delete</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  )
}
