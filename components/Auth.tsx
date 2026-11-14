'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase'
import PasswordInput from './PasswordInput'
import { isStrong } from '@/lib/password'

export function Login() {
  const [mode, setMode] = useState('in')
  const [kind, setKind] = useState('company')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [empCode, setEmpCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function forgot() {
    if (!email) return setMsg('Enter your email first')
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/reset' })
    setMsg(error ? error.message : 'Check your email for a reset link')
  }

  async function submit() {
    setBusy(true); setMsg('')
    if (mode === 'in') {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message)
    } else if (kind === 'employee' && (!code.trim() || !name.trim() || !empCode.trim())) {
      setMsg('Enter your name, company code and Employee ID. Your HR can give you both.')
    } else if (!isStrong(password)) {
      setMsg('Choose a strong password: 10+ characters with uppercase, lowercase, a number and a symbol.')
    } else {
      const data = kind === 'employee' ? { join_code: code.trim().toUpperCase(), employee_code: empCode.trim().toUpperCase(), full_name: name.trim() } : {}
      const { data: out, error } = await sb.auth.signUp({ email, password, options: { data } })
      if (error) setMsg(error.message)
      else if (!out.session) setMsg('Check your email to confirm your account, then sign in. ' + (kind === 'employee' ? 'Your HR team will also verify and approve your request.' : ''))
    }
    setBusy(false)
  }

  return (
    <div className="auth">
      <div className="brandlogo tile"><img src="/logo.png" alt="HR Nest" /></div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{mode === 'in' ? 'Sign in' : 'Create your account'}</h2>
        {mode === 'up' && (
          <div className="tabs" style={{ marginTop: 0 }}>
            <button className={'tab' + (kind === 'company' ? ' on' : '')} onClick={() => setKind('company')}>I run a company</button>
            <button className={'tab' + (kind === 'employee' ? ' on' : '')} onClick={() => setKind('employee')}>I am an employee</button>
          </div>
        )}
        {mode === 'up' && kind === 'employee' && (
          <>
            <label>Your full name</label><input value={name} onChange={e => setName(e.target.value)} />
            <label>Company code (ask your HR)</label><input value={code} onChange={e => setCode(e.target.value)} />
            <label>Employee ID (given by your HR, like EMP-003)</label><input value={empCode} onChange={e => setEmpCode(e.target.value)} />
          </>
        )}
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password</label>
        <PasswordInput value={password} onChange={setPassword} meter={mode === 'up'} generate={mode === 'up'} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
        {msg && <div className={msg.startsWith('Check your email') ? 'ok' : 'err'}>{msg}</div>}
        <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={submit}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
        {mode === 'in' && <p className="muted" style={{ textAlign: 'center', cursor: 'pointer', marginBottom: 0 }} onClick={forgot}>Forgot password?</p>}
        <p className="muted" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </p>
        <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginBottom: 0 }}><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
      </div>
    </div>
  )
}

export function Setup({ userId, onDone }: { userId: string; onDone: (c: any) => void }) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [aiKey, setAiKey] = useState('')
  const [msg, setMsg] = useState('')

  async function save() {
    if (!name.trim()) return setMsg('Enter your company name')
    const { data, error } = await sb.from('companies').insert({ owner_id: userId, name, country, currency }).select().single()
    if (error) return setMsg(error.message)
    if (aiKey.trim()) {
      const { data: sess } = await sb.auth.getSession()
      const res = await fetch('/api/ai-key', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.session?.access_token }, body: JSON.stringify({ key: aiKey }) })
      if (!res.ok) { const out = await res.json(); alert('Your company is ready, but the AI key was not saved: ' + out.error + '\n\nYou can add it later in Settings.') }
    }
    onDone(data)
  }

  return (
    <div className="auth">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Set up your company</h2>
        <label>Company name</label>
        <input value={name} onChange={e => setName(e.target.value)} />
        <label>Country</label>
        <input value={country} onChange={e => setCountry(e.target.value)} />
        <label>Currency</label>
        <input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} />
        <label>Your AI key (optional, Gemini, OpenAI or Claude. You can add it later)</label>
        <PasswordInput value={aiKey} onChange={setAiKey} autoComplete="off" placeholder="AIza... or sk-... or sk-ant-..." />
        {msg && <div className="err">{msg}</div>}
        <button className="btn" style={{ width: '100%' }} onClick={save}>Continue</button>
        <button className="btn ghost" style={{ width: '100%' }} onClick={() => sb.auth.signOut()}>Sign out</button>
      </div>
    </div>
  )
}
