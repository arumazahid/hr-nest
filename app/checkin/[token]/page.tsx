'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function Checkin() {
  const { token } = useParams() as { token: string }
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  function go() {
    setBusy(true); setMsg('')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const res = await fetch('/api/checkin', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, lat: pos.coords.latitude, lng: pos.coords.longitude })
        })
        const out = await res.json()
        setOk(res.ok); setMsg(out.message || out.error); setBusy(false)
      },
      () => { setOk(false); setMsg('Location access was blocked. Allow location and try again.'); setBusy(false) },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  return (
    <div className="auth">
      <div className="logo" style={{ marginBottom: 20 }}><span>✓</span>HR Nest</div>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginTop: 0 }}>Check in or out</h2>
        <p className="muted">You must be at the office. Your phone shares its location once.</p>
        <button className="btn" style={{ width: '100%' }} disabled={busy} onClick={go}>{busy ? 'Checking location...' : 'Check in / out'}</button>
        {msg && <div className={ok ? 'ok' : 'err'}>{msg}</div>}
      </div>
    </div>
  )
}
