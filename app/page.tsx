'use client'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Camera, Users as UsersIcon, Building2, Wallet, FileText, Briefcase, Bot, ShieldCheck, Settings as Cog, LogOut, Menu, CalendarDays, CalendarCheck, ClipboardList, BarChart3, Mail, CreditCard, UserCircle, ClipboardCheck, ExternalLink, MessageCircle } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { ACCESS, WRITE, SECTIONS, LABEL, TABLABEL, TITLES, SELF_CONTAINED, LINKS } from '@/lib/roles'
import Community from '@/components/Community'
import TemplatesPage from '@/components/TemplatesPage'
import { setActor } from '@/lib/activity'
import HrDesk from '@/components/HrDesk'
import Profile from '@/components/Profile'
import { Login, Setup } from '@/components/Auth'
import Dashboard from '@/components/Dashboard'
import Candidates from '@/components/Candidates'
import Interviews from '@/components/Interviews'
import Jobs from '@/components/Jobs'
import Settings from '@/components/Settings'
import Employees from '@/components/Employees'
import Departments from '@/components/Departments'
import Holidays from '@/components/Holidays'
import Attendance from '@/components/Attendance'
import Payroll from '@/components/Payroll'
import Assistant from '@/components/Assistant'
import UsersPage from '@/components/Users'
import Leaves from '@/components/Leaves'
import Records from '@/components/Records'
import Reports from '@/components/Reports'
import Kiosk from '@/components/Kiosk'
import Letters from '@/components/Letters'
import Portal from '@/components/Portal'

const ICONS: Record<string, any> = {
  Dashboard: LayoutDashboard, 'HR Desk': ClipboardCheck, Profile: UserCircle, Portal: UserCircle, Attendance: Camera, Employees: UsersIcon, Departments: Building2, Holidays: CalendarDays,
  Leave: CalendarCheck, Records: ClipboardList, Reports: BarChart3, Letters: Mail, 'ID Cards': CreditCard, Payroll: Wallet,
  Community: MessageCircle, Templates: Mail, Candidates: FileText, Interviews: CalendarCheck, Jobs: Briefcase, Assistant: Bot, Users: ShieldCheck, Settings: Cog
}

function Clock({ tz }: { tz: string }) {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('en-GB', { timeZone: tz || 'UTC' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tz])
  return <span className="pill clockpill">{t}</span>
}

function Notice({ title, text, children }: { title: string; text: string; children?: any }) {
  return (
    <div className="auth">
      <div className="brandlogo tile"><img src="/logo.png" alt="HR Nest" /></div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p className="muted">{text}</p>
        {children}
        <button className="btn ghost" style={{ width: '100%' }} onClick={() => sb.auth.signOut()}>Sign out</button>
      </div>
    </div>
  )
}

export default function Home() {
  const [session, setSession] = useState<any>(undefined)
  const [me, setMe] = useState<any>(null)
  const [page, setPage] = useState('')
  const [param, setParam] = useState('')
  const [open, setOpen] = useState(false)
  const [kiosk, setKiosk] = useState(false)
  const [code, setCode] = useState('')

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadMe = async (s = session) => {
    const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + s.access_token } })
    const out = await res.json()
    setMe(out)
    if (out.profile) setActor({ id: out.profile.id, name: out.profile.name, role: out.role })
    if (out.role && out.status === 'active' && !page) {
      const first = SECTIONS.flatMap(s => s.pages).filter(i => !LINKS[i]).find(i => ACCESS[i].includes(out.role)) || ''
      setPage(out.role === 'hr' ? 'HR Desk' : first)
    }
  }
  useEffect(() => { if (session) loadMe(session); else setMe(null) }, [session])

  if (session === undefined) return null
  if (!session) return <Login />
  if (me === null) return null
  if (me.status === 'pending') return <Notice title="Waiting for approval" text={`Your account for ${me.company?.name} has been created. Your admin must approve it before you can sign in.`}><button className="btn" style={{ width: '100%' }} onClick={() => loadMe()}>Check again</button></Notice>
  if (me.status === 'rejected') return <Notice title="Request not approved" text="Your company admin did not approve this account. Please contact your HR team." />
  if (me.status === 'badcode') return (
    <Notice title="Company code not found" text="The company code you entered does not match any company. Check it with your HR and try again.">
      <label>Company code</label><input value={code} onChange={e => setCode(e.target.value)} />
      <button className="btn" style={{ width: '100%' }} onClick={async () => { await sb.auth.updateUser({ data: { join_code: code.trim().toUpperCase() } }); loadMe() }}>Try this code</button>
    </Notice>
  )
  if (me.status === 'badid') return (
    <Notice title="Employee ID not found" text="We could not match this Employee ID with your company's employee list. Check the ID with your HR (for example EMP-003) and try again.">
      <label>Employee ID</label><input value={code} onChange={e => setCode(e.target.value)} />
      <button className="btn" style={{ width: '100%' }} onClick={async () => { await sb.auth.updateUser({ data: { employee_code: code.trim().toUpperCase() } }); loadMe() }}>Try this ID</button>
    </Notice>
  )
  if (!me.role) return <Setup userId={session.user.id} onDone={() => loadMe()} />

  const company = me.company
  const canWrite = WRITE[page]?.includes(me.role)
  const go = (p: string, prm = '') => { setPage(p); setParam(prm); setOpen(false) }
  const view: Record<string, any> = {
    Dashboard: <Dashboard company={company} role={me.role} name={me.profile?.name} />, 'HR Desk': <HrDesk company={company} role={me.role} go={go} />,
    Profile: <Profile profile={me.profile} email={session.user.email || ''} role={me.role} onSaved={(p: any) => setMe({ ...me, profile: p })} />, Portal: <Portal />, Candidates: <Candidates company={company} />,
    Interviews: <Interviews company={company} />, Jobs: <Jobs company={company} />,
    Employees: <Employees company={company} onOpenCard={(id: string) => window.open('/id-cards?emp=' + id, '_blank')} />,
    Attendance: <Attendance company={company} />,
    Departments: <Departments company={company} />, Holidays: <Holidays company={company} />,
    Letters: <Letters company={company} />, Leave: <Leaves company={company} />, Records: <Records company={company} />,
    Reports: <Reports company={company} canEdit={!!WRITE.Reports.includes(me.role)} />, Payroll: <Payroll company={company} />,
    Community: <Community company={company} profile={me.profile} role={me.role} />, Templates: <TemplatesPage company={company} />,
    Assistant: <Assistant />, Users: <UsersPage company={company} onCode={(c: string) => setMe({ ...me, company: { ...company, join_code: c } })} />,
    Settings: <Settings company={company} onSaved={(c: any) => setMe({ ...me, company: c })} />
  }
  const [title, sub] = TITLES[page] || ['', '']
  const email = session.user.email || ''
  const readOnly = !canWrite && !SELF_CONTAINED.includes(page)
  const section = SECTIONS.find(sc => sc.pages.includes(page))
  const tabs = section ? section.pages.filter(p => ACCESS[p]?.includes(me.role)) : []

  return (
    <div className="app">
      {kiosk && <Kiosk company={company} onExit={() => setKiosk(false)} />}
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'side' + (open ? ' open' : '')}>
        <div className="brandlogo inside"><img src="/logo.png" alt="HR Nest" /></div>
        {SECTIONS.map(sec => {
          const pages = sec.pages.filter(p => ACCESS[p]?.includes(me.role))
          const first = pages.find(p => !LINKS[p])
          if (!first) return null
          const Icon = ICONS[sec.icon] || LayoutDashboard
          return <button key={sec.id} className={'navitem' + (section?.id === sec.id ? ' on' : '')} onClick={() => go(first)}><Icon size={18} />{sec.label}</button>
        })}
        <div className="me">
          <button className="avatar sm mebtn" title="My profile" onClick={() => go('Profile')}>{me.profile?.avatar ? <img src={me.profile.avatar} alt="" /> : (me.profile?.name || email)[0]?.toUpperCase()}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 13 }}>{me.profile?.name || me.role}</b>
            <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.role} · {email}</div>
          </div>
          <button className="burger" style={{ display: 'block' }} title="Sign out" onClick={() => sb.auth.signOut()}><LogOut size={16} /></button>
        </div>
      </aside>
      <main className="main">
        <div className="top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="burger" onClick={() => setOpen(!open)}><Menu size={18} /></button>
            <div style={{ minWidth: 0 }}>
              <h2>{title}</h2>
              <div className="muted subline">{company.name} · {sub}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Clock tz={company.timezone} />
            {ACCESS.Attendance.includes(me.role) && <button className="btn" style={{ marginTop: 0 }} onClick={() => { document.documentElement.requestFullscreen?.().catch(() => {}); setKiosk(true) }}>Launch Kiosk</button>}
          </div>
        </div>
        <div className="content">
          {tabs.length > 1 && (
            <div className="sectabs">
              {tabs.map(p => LINKS[p]
                ? <a key={p} className="sectab" href={LINKS[p]} target="_blank" rel="noopener noreferrer">{TABLABEL[p] || LABEL[p] || p} <ExternalLink size={12} /></a>
                : <button key={p} className={'sectab' + (page === p ? ' on' : '')} onClick={() => go(p)}>{TABLABEL[p] || LABEL[p] || p}</button>)}
            </div>
          )}
          {readOnly && <p className="muted">View only: your role cannot change anything on this page.</p>}
          <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{view[page]}</fieldset>
        </div>
      </main>
    </div>
  )
}
