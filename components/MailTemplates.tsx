'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase'
import { DEFAULTS, KINDS, PLACEHOLDERS } from '@/lib/templates'
import { toast } from './Toast'

export default function MailTemplates({ company, templates, onSaved }: { company: any; templates: Record<string, any>; onSaved: () => void }) {
  const [kind, setKind] = useState('interview')
  const cur = templates[kind] || DEFAULTS[kind]
  const [draft, setDraft] = useState<Record<string, any>>({})
  const t = draft[kind] || cur
  const set = (p: any) => setDraft({ ...draft, [kind]: { ...t, ...p } })

  async function save() {
    const { error } = await sb.from('mail_templates').upsert({ company_id: company.id, kind, subject: t.subject, body: t.body, updated_at: new Date().toISOString() }, { onConflict: 'company_id,kind' })
    if (error) return toast(error.message, 'err')
    toast('Template saved'); setDraft({ ...draft, [kind]: undefined }); onSaved()
  }
  async function reset() {
    await sb.from('mail_templates').delete().eq('company_id', company.id).eq('kind', kind)
    toast('Back to the standard template'); setDraft({ ...draft, [kind]: undefined }); onSaved()
  }

  return (
    <div className="card">
      <h3>Email templates</h3>
      <p className="muted">Write each email once. The details in curly brackets are filled in automatically for every candidate, from your company settings. Lines whose detail is empty are left out.</p>
      <div className="tabs">{KINDS.map(([k, l]) => <button key={k} className={'tab' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}</div>
      <label>Subject</label><input value={t.subject} onChange={e => set({ subject: e.target.value })} />
      <label>Message</label><textarea rows={16} value={t.body} onChange={e => set({ body: e.target.value })} />
      <p className="muted">Details you can use: {PLACEHOLDERS.map(p => <code key={p} style={{ marginRight: 6 }}>{'{' + p + '}'}</code>)}</p>
      <button className="btn" onClick={save}>Save template</button>
      <button className="btn ghost" style={{ marginLeft: 8 }} onClick={reset}>Use the standard template</button>
    </div>
  )
}
