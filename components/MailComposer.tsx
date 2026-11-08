'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { buildVars, fillTemplate, DEFAULTS, KINDS } from '@/lib/templates'
import { toast } from './Toast'

type Props = { company: any; cand: any; kind: string; position?: string; templates: Record<string, any>; onClose: () => void; onDone: () => void }

export default function MailComposer({ company, cand, kind, position, templates, onClose, onDone }: Props) {
  const [reason, setReason] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const label = KINDS.find(k => k[0] === kind)?.[1] || 'Email'

  useEffect(() => {
    const t = fillTemplate(templates[kind] || DEFAULTS[kind], buildVars(company, cand, { position, reason }))
    setSubject(t.subject); setBody(t.body)
  }, [kind, reason, cand?.id])

  async function send() {
    setBusy(true)
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify({ candidateId: cand.id, kind, subject, body }) })
    const out = await res.json()
    setBusy(false)
    if (!res.ok) return toast(out.error || 'Could not send', 'err')
    if (out.emailed) toast(`${label} email sent to ${cand.name}`)
    else toast(`Status saved, but the email was NOT sent: ${out.reason}`, 'err')
    onDone()
  }

  return (
    <div className="card">
      <div className="cardhead"><div><h3>{label}: {cand.name}</h3><p className="muted">{cand.email ? `To: ${cand.email}` : 'This candidate has no email saved, so nothing can be sent'}. You can edit the message before sending.</p></div></div>
      {kind === 'rejected' && <><label>Reason to tell the candidate (optional, one short sentence)</label>
        <input placeholder="for example we needed more experience with CRM tools" value={reason} onChange={e => setReason(e.target.value)} /></>}
      <label>Subject</label><input value={subject} onChange={e => setSubject(e.target.value)} />
      <label>Message</label><textarea rows={14} value={body} onChange={e => setBody(e.target.value)} />
      <button className="btn" disabled={busy || !cand.email} onClick={send}>{busy ? 'Sending...' : kind === 'rejected' ? 'Reject and send email' : kind === 'selected' ? 'Select and send email' : 'Send email'}</button>
      <button className="btn ghost" style={{ marginLeft: 8 }} onClick={onClose}>Cancel</button>
    </div>
  )
}
