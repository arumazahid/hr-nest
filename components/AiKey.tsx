'use client'
import { useState } from 'react'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import { sb } from '@/lib/supabase'
import PasswordInput from './PasswordInput'
import { toast } from './Toast'

const NAMES: Record<string, string> = { gemini: 'Google Gemini', openai: 'OpenAI', anthropic: 'Anthropic Claude' }

export default function AiKey({ company, onChange }: { company: any; onChange: (patch: any) => void }) {
  const [key, setKey] = useState('')
  const [model, setModel] = useState(company.ai_model || '')
  const [adv, setAdv] = useState(false)
  const [busy, setBusy] = useState(false)
  const connected = !!company.ai_provider

  async function call(method: string, body?: any) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/ai-key', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: body ? JSON.stringify(body) : undefined })
    return { ok: res.ok, out: await res.json() }
  }
  async function save() {
    if (!key.trim()) return toast('Paste your key first', 'err')
    setBusy(true)
    const { ok, out } = await call('POST', { key, model })
    setBusy(false)
    if (!ok) return toast(out.error || 'Could not save the key', 'err')
    setKey(''); onChange({ ai_provider: out.provider, ai_model: out.model }); toast(`${NAMES[out.provider]} key connected and tested`)
  }
  async function remove() {
    if (!confirm('Remove your AI key? Scanned CVs and the Assistant will stop working until you add one again.')) return
    await call('DELETE'); onChange({ ai_provider: null, ai_model: null }); setModel(''); toast('AI key removed')
  }

  return (
    <div className="card aikey">
      <div className="cardhead">
        <div>
          <h3><Sparkles size={17} style={{ verticalAlign: -3 }} /> Your AI key</h3>
          <p className="muted">Used only for your company, to read scanned CVs and to answer in the Assistant. Everyone brings their own key, so nobody pays for anyone else.</p>
        </div>
        {connected
          ? <span className="tag ok"><CheckCircle2 size={13} style={{ verticalAlign: -2 }} /> {NAMES[company.ai_provider]} connected</span>
          : <span className="tag warn">Not connected</span>}
      </div>
      <label>{connected ? 'Replace your key' : 'Paste your key'}</label>
      <PasswordInput value={key} onChange={setKey} autoComplete="off" placeholder="AIza... or sk-... or sk-ant-..." />
      <p className="muted" style={{ margin: '6px 0' }}>We find out by ourselves whether it is Gemini, OpenAI or Claude, and test it before saving. It is stored encrypted and never shown again.</p>
      <button className="linkbtn" onClick={() => setAdv(!adv)}>{adv ? 'Hide' : 'Show'} model name (only if asked)</button>
      {adv && <><input placeholder="Leave empty to use the standard model" value={model} onChange={e => setModel(e.target.value)} />
        <p className="muted">If your provider retires a model, type the new model name here. No code change is needed.</p></>}
      <div className="actrow" style={{ marginTop: 10 }}>
        <button className="btn" style={{ marginTop: 0 }} disabled={busy} onClick={save}>{busy ? 'Testing the key...' : 'Save and test'}</button>
        {connected && <button className="btn ghost" style={{ marginTop: 0 }} onClick={remove}>Remove key</button>}
      </div>
      <p className="muted" style={{ marginTop: 12 }}>Get a key: Gemini at aistudio.google.com/apikey · OpenAI at platform.openai.com/api-keys · Claude at console.anthropic.com</p>
    </div>
  )
}
