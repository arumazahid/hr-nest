'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase'

export default function Assistant() {
  const [chat, setChat] = useState<{ me: boolean; text: string }[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speak, setSpeak] = useState(true)

  async function ask(question: string) {
    if (!question.trim()) return
    setChat(c => [...c, { me: true, text: question }]); setQ(''); setBusy(true)
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token },
      body: JSON.stringify({ question })
    })
    const out = await res.json()
    const text = out.answer || out.error
    setChat(c => [...c, { me: false, text }]); setBusy(false)
    if (speak && 'speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }

  function listen() {
    const w: any = window
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Rec) return alert('Voice input is not supported in this browser. Use Chrome or Edge.')
    const r = new Rec()
    r.lang = 'en-US'
    r.onstart = () => setListening(true)
    r.onend = () => setListening(false)
    r.onresult = (e: any) => ask(e.results[0][0].transcript)
    r.start()
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>HR assistant</h3>
      <p className="muted">Ask about today's attendance, payroll or top candidates. Try: "Who is absent today?"</p>
      {chat.map((m, i) => <div key={i} className={'msg ' + (m.me ? 'me' : 'ai')}>{m.text}</div>)}
      {busy && <div className="muted">Thinking...</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={q} placeholder="Type your question" onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(q)} />
        <button className="btn" style={{ marginTop: 0 }} onClick={() => ask(q)}>Ask</button>
        <button className="btn ghost" style={{ marginTop: 0 }} onClick={listen}>{listening ? 'Listening...' : 'Speak'}</button>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={speak} onChange={e => setSpeak(e.target.checked)} />Read answers aloud
      </label>
    </div>
  )
}
