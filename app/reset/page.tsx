'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import PasswordInput from '@/components/PasswordInput'
import { isStrong } from '@/lib/password'

export default function Reset() {
  const [ready, setReady] = useState(false)
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setReady(!!data.session))
    const { data } = sb.auth.onAuthStateChange((e, s) => { if (e === 'PASSWORD_RECOVERY' || s) setReady(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  async function save() {
    if (!isStrong(pw)) return setMsg('Use 10+ characters with uppercase, lowercase, a number and a symbol')
    const { error } = await sb.auth.updateUser({ password: pw })
    if (error) return setMsg(error.message)
    setDone(true)
  }

  return (
    <div className="auth">
      <div className="brandlogo tile"><img src="/logo.png" alt="HR Nest" /></div>
      <div className="card">
        {done ? (
          <><h2 style={{ marginTop: 0 }}>Password changed</h2><a className="btn" style={{ display: 'inline-block', textDecoration: 'none' }} href="/">Go to HR Nest</a></>
        ) : !ready ? (
          <p className="muted">Open this page from the reset link in your email.</p>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Choose a new password</h2>
            <label>New password</label>
            <PasswordInput value={pw} onChange={setPw} meter generate autoComplete="new-password" />
            {msg && <div className="err">{msg}</div>}
            <button className="btn" style={{ width: '100%' }} onClick={save}>Save password</button>
          </>
        )}
      </div>
    </div>
  )
}
