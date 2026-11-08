'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { sb } from '@/lib/supabase'
import IdCards from '@/components/IdCards'
import { Login } from '@/components/Auth'

// A separate page (its own link) so HR can open all employee ID cards in a new tab.
// Only admin and HR can open it. Employees only ever see their own dashboard.
export default function IdCardsPage() {
  const [session, setSession] = useState<any>(undefined)
  const [me, setMe] = useState<any>(null)
  const [emp, setEmp] = useState('')

  useEffect(() => {
    setEmp(new URLSearchParams(location.search).get('emp') || '')
    sb.auth.getSession().then(({ data }) => setSession(data.session))
  }, [])
  useEffect(() => {
    if (!session) return
    fetch('/api/me', { headers: { Authorization: 'Bearer ' + session.access_token } }).then(r => r.json()).then(setMe)
  }, [session])

  if (session === undefined) return null
  if (!session) return <Login />
  if (!me) return null
  if (me.status !== 'active' || !['admin', 'hr'].includes(me.role)) {
    return (
      <div className="auth"><div className="card"><h2 style={{ marginTop: 0 }}>Not available</h2>
        <p className="muted">ID cards can only be opened by your HR team or admin. Your own details are on your dashboard.</p>
        <a className="btn" style={{ display: 'inline-block', textDecoration: 'none' }} href="/">Go to my dashboard</a></div></div>
    )
  }
  return (
    <div className="idpage">
      <div className="top noprint">
        <a className="linkbtn" href="/"><ArrowLeft size={15} /> Back to HR Nest</a>
        <b>Employee ID cards</b>
        <span className="pill dark"><ShieldCheck size={15} /> HR only</span>
      </div>
      <div className="content"><IdCards company={me.company} initialId={emp} /></div>
    </div>
  )
}
