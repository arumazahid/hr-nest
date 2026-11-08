'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'

export default function Portal({ token }: { token?: string }) {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [f, setF] = useState({ day: '', leave_type: 'annual', type: 'full', reason: '' })
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  async function headers(): Promise<any> {
    if (token) return { 'Content-Type': 'application/json' }
    const { data } = await sb.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }
  }
  const load = async () => {
    const res = await fetch('/api/self' + (token ? '?token=' + token : ''), { headers: await headers() })
    const o = await res.json()
    o.error ? setErr(o.error) : setD(o)
  }
  useEffect(() => { load() }, [token])

  async function request() {
    const res = await fetch('/api/self', { method: 'POST', headers: await headers(), body: JSON.stringify({ token, ...f }) })
    const out = await res.json()
    setOk(res.ok); setMsg(res.ok ? 'Request sent. Your HR team will approve or reject it.' : out.error)
    if (res.ok) { setF({ ...f, day: '', reason: '' }); load() }
  }

  function checkin() {
    setMsg('Checking location...'); setOk(false)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const res = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token || d.token, lat: pos.coords.latitude, lng: pos.coords.longitude }) })
        const out = await res.json()
        setOk(res.ok); setMsg(out.message || out.error); load()
      },
      () => { setOk(false); setMsg('Location access was blocked. Allow location and try again.') },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  if (err) return <div className="auth"><p className="err">{err}</p></div>
  if (!d) return <p className="muted">Loading...</p>
  const b = d.balance
  const colors: Record<string, string> = { approved: '#16a34a', pending: '#d97706', rejected: '#dc2626' }
  const tm = (iso: string) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: d.tz, hour: '2-digit', minute: '2-digit' }) : '-')
  const slipUrl = (id: string) => (token ? `/me/${token}/payslip/${id}` : `/my/payslip/${id}`)

  return (
    <div style={{ maxWidth: 680 }}>
      <h2 style={{ marginBottom: 2 }}>Hello, {d.name}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{d.code} · {d.company} · This month: {d.present} day(s) present, {d.late} late</p>
      <div className="grid">
        <div className="card"><small className="muted">ANNUAL LEAVE LEFT</small><h2 style={{ margin: '4px 0' }}>{b.annual.quota - b.annual.used} <span className="muted" style={{ fontSize: 14 }}>of {b.annual.quota}</span></h2></div>
        <div className="card"><small className="muted">SICK LEAVE LEFT</small><h2 style={{ margin: '4px 0' }}>{b.sick.quota - b.sick.used} <span className="muted" style={{ fontSize: 14 }}>of {b.sick.quota}</span></h2></div>
      </div>
      {d.perf?.length > 0 && (
        <div className="card">
          <b>Feedback from HR</b>
          {d.perf.map((p: any) => (
            <div className="drow" key={p.month} style={{ flexDirection: 'column', gap: 4 }}>
              <span><b>{new Date(p.month + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b>{p.rating ? <span className="tag" style={{ marginLeft: 8 }}>{'★'.repeat(p.rating)}{'☆'.repeat(5 - p.rating)}</span> : null}</span>
              {p.notes && <span className="muted">{p.notes}</span>}
            </div>
          ))}
        </div>
      )}
      {d.gps && <button className="btn" style={{ width: '100%', marginBottom: 14 }} onClick={checkin}>Check in / out with my phone</button>}
      {msg && <div className={ok ? 'ok' : 'err'} style={{ marginBottom: 14 }}>{msg}</div>}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Request leave</h3>
        <div className="grid">
          <div><label>Date</label><input type="date" value={f.day} onChange={e => setF({ ...f, day: e.target.value })} /></div>
          <div><label>Type</label>
            <select value={f.leave_type} onChange={e => setF({ ...f, leave_type: e.target.value })}><option value="annual">Annual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option></select></div>
          <div><label>Duration</label>
            <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="full">Full day</option><option value="half">Half day</option></select></div>
          <div><label>Reason</label><input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
        </div>
        <button className="btn" onClick={request}>Send request</button>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>My recent attendance</h3>
        {d.recent.length === 0 && <p className="muted">No attendance yet.</p>}
        {d.recent.map((a: any) => <div className="drow" key={a.day}><span>{a.day} {a.late && <span className="tag">late</span>}</span><span>{tm(a.check_in)} to {tm(a.check_out)}</span></div>)}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>My payslips</h3>
        {d.slips.length === 0 && <p className="muted">No payslips yet.</p>}
        {d.slips.map((s: any) => (
          <div className="drow" key={s.id}><span>{s.month} · {Number(s.net).toFixed(2)} {d.currency}</span><a href={slipUrl(s.id)} target="_blank">View</a></div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>My leaves</h3>
        {d.leaves.length === 0 && <p className="muted">No leaves yet.</p>}
        {d.leaves.map((l: any) => (
          <div className="drow" key={l.id}><span>{l.day} · {l.leave_type} · {l.type} day</span><span className="badge" style={{ background: colors[l.status] }}>{l.status}</span></div>
        ))}
      </div>
    </div>
  )
}
