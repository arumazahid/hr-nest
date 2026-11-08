'use client'
import { useEffect, useRef, useState } from 'react'
import { sb } from '@/lib/supabase'
import Scanner from './Scanner'

const COLORS: Record<string, string> = { in: '#16a34a', late: '#d97706', out: '#2563eb', dup: '#64748B', error: '#dc2626' }

export default function Kiosk({ company, onExit }: { company: any; onExit: () => void }) {
  const [emps, setEmps] = useState<any[]>([])
  const [mode, setMode] = useState('qr')
  const [res, setRes] = useState<any>(null)
  const [now, setNow] = useState('')
  const last = useRef<Record<string, number>>({})

  useEffect(() => {
    sb.from('employees').select('*').eq('active', true).then(({ data }) => setEmps(data || []))
    const tick = () => setNow(new Date().toLocaleTimeString('en-GB', { timeZone: company.timezone }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  async function hit(emp: any) {
    if (Date.now() - (last.current[emp.id] || 0) < 8000) return
    last.current[emp.id] = Date.now()
    const { data } = await sb.auth.getSession()
    const r = await fetch('/api/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token },
      body: JSON.stringify({ employeeId: emp.id, method: mode })
    })
    const out = await r.json()
    setRes(r.ok ? out : { kind: 'error', message: out.error })
    setTimeout(() => setRes(null), 4500)
  }

  function exit() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    onExit()
  }

  return (
    <div className="kiosk">
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 760, alignItems: 'center' }}>
        <div className="logo" style={{ color: '#fff' }}><span>✓</span>{company.name}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {company.face_enabled && (
            <select value={mode} onChange={e => setMode(e.target.value)} style={{ width: 'auto' }}>
              <option value="qr">QR code</option><option value="face">Face</option>
            </select>
          )}
          <button className="btn" style={{ marginTop: 0 }} onClick={exit}>Exit kiosk</button>
        </div>
      </div>
      <div style={{ fontSize: 64, fontWeight: 800, margin: '18px 0 4px', fontVariantNumeric: 'tabular-nums' }}>{now}</div>
      <div style={{ color: '#CBD5E1', marginBottom: 16 }}>{mode === 'qr' ? 'Hold your QR card up to the camera' : 'Look at the camera'}</div>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <Scanner key={mode} mode={mode} emps={emps} onHit={hit} autoStart />
      </div>
      <div className="kres" style={{ background: res ? COLORS[res.kind] || '#64748B' : 'transparent' }}>{res?.message || ''}</div>
    </div>
  )
}
