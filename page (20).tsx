'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function Apply() {
  const { slug } = useParams() as { slug: string }
  const [job, setJob] = useState<any>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/apply?slug=' + slug).then(r => r.json()).then(d => (d.error ? setMsg(d.error) : setJob(d)))
  }, [slug])

  async function submit() {
    if (!name.trim() || !email.trim() || !file) return setMsg('Enter your name, email and attach your CV')
    setBusy(true); setMsg('')
    const form = new FormData()
    form.append('slug', slug); form.append('name', name); form.append('email', email); form.append('file', file)
    const res = await fetch('/api/apply', { method: 'POST', body: form })
    const out = await res.json()
    if (!res.ok) setMsg(out.error)
    else setDone(true)
    setBusy(false)
  }

  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <div className="nav"><div className="logo"><span>✓</span>{job?.company || 'HR Nest'}</div></div>
      {!job && <p className={msg ? 'err' : 'muted'}>{msg || 'Loading...'}</p>}
      {job && done && <div className="card"><h2>Application received</h2><p>Thank you, {name}. The hiring team will contact you if your profile fits.</p></div>}
      {job && !done && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>{job.title}</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
          <label>Full name</label><input value={name} onChange={e => setName(e.target.value)} />
          <label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <label>CV (PDF, DOCX or image, up to 4 MB)</label>
          <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)} />
          {msg && <div className="err">{msg}</div>}
          <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Sending...' : 'Submit application'}</button>
        </div>
      )}
    </div>
  )
}
