'use client'
import { useEffect, useState } from 'react'
import { Users, UserCheck, Clock, UserX, CalendarDays, Briefcase, CalendarClock, Wallet } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { zoned } from '@/lib/time'
import PerformanceBoard from './PerformanceBoard'

const addDays = (day: string, n: number) => {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const short = (day: string) => new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })

function Trend({ days }: { days: { label: string; ok: number; late: number }[] }) {
  const W = 640, H = 240, P = 34
  const max = Math.max(1, ...days.map(d => d.ok + d.late))
  const bw = (W - 2 * P) / days.length
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const ticks = Array.from(new Set([0, Math.ceil(max / 2), max]))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={P} x2={W - P} y1={y(t)} y2={y(t)} stroke="#E8ECF3" strokeDasharray={t ? '4 4' : ''} />
          <text x={P - 8} y={y(t) + 4} fontSize="11" fill="#64748B" textAnchor="end">{t}</text>
        </g>
      ))}
      {days.map((d, i) => {
        const x = P + i * bw + bw * 0.22, w = bw * 0.56
        return (
          <g key={i}>
            <title>{`${d.label}: ${d.ok} on time, ${d.late} late`}</title>
            <rect x={x} y={y(d.ok)} width={w} height={H - P - y(d.ok)} rx="5" fill="#2563EB" />
            {d.late > 0 && <rect x={x} y={y(d.ok + d.late)} width={w} height={y(d.ok) - y(d.ok + d.late)} rx="5" fill="#F59E0B" />}
            <text x={x + w / 2} y={H - 10} fontSize="11" fill="#64748B" textAnchor="middle">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function Donut({ parts, total }: { parts: [string, number, string][]; total: number }) {
  const R = 54, C = 2 * Math.PI * R
  let off = 0
  return (
    <svg viewBox="0 0 140 140" style={{ width: 150, height: 150 }}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="#EEF2F7" strokeWidth="16" />
      {total > 0 && parts.map(([l, v, c]) => {
        const len = (v / total) * C; const el = <circle key={l} cx="70" cy="70" r={R} fill="none" stroke={c} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />
        off += len; return el
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0F172A">{total}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="11" fill="#64748B">employees</text>
    </svg>
  )
}

export default function Dashboard({ company, role, name, go }: { company: any; role: string; name?: string; go?: (p: string) => void }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: company.timezone })
  const [d, setD] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    (async () => {
      const from = addDays(today, -6)
      const [emps, att, lv, hol, pend, jobsQ, candQ, ivQ, payQ, deptQ] = await Promise.all([
        sb.from('employees').select('id, department_id').eq('active', true),
        sb.from('attendance').select('employee_id, day, late').gte('day', from).lte('day', today),
        sb.from('leaves').select('employee_id, day, type, employees(name)').eq('status', 'approved').gte('day', today).order('day').limit(50),
        sb.from('holidays').select('day, name').gte('day', today).order('day').limit(3),
        sb.from('leaves').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        sb.from('candidates').select('id', { count: 'exact', head: true }),
        sb.from('interviews').select('id', { count: 'exact', head: true }).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()),
        sb.from('payroll').select('month, net').order('month', { ascending: false }).limit(300),
        sb.from('departments').select('id, name')
      ])
      const lastMonth = payQ.data?.[0]?.month
      const heads: Record<string, number> = {}
      ;(emps.data || []).forEach((e: any) => { const n = (deptQ.data || []).find((x: any) => x.id === e.department_id)?.name || 'No department'; heads[n] = (heads[n] || 0) + 1 })
      const rows = att.data || []
      const leaves = lv.data || []
      const holiday = (hol.data || []).find((h: any) => h.day === today)
      const weekday = new Date(today + 'T00:00:00Z').getUTCDay()
      const off = (company.weekend_days || [0, 6]).includes(weekday) ? 'weekend' : holiday ? holiday.name : ''
      const total = emps.data?.length || 0
      const here = rows.filter((r: any) => r.day === today)
      const away = leaves.filter((l: any) => l.day === today).length
      setD({
        jobs: jobsQ.count || 0, cands: candQ.count || 0, ivs: ivQ.count || 0, heads, payMonth: lastMonth,
        payTotal: (payQ.data || []).filter((p: any) => p.month === lastMonth).reduce((s: number, p: any) => s + Number(p.net), 0),
        pending: pend.count || 0, total, present: here.length, late: here.filter((r: any) => r.late).length, away, off,
        absent: off ? 0 : Math.max(0, total - here.length - away),
        days: Array.from({ length: 7 }, (_, i) => {
          const day = addDays(from, i)
          const list = rows.filter((r: any) => r.day === day)
          return { label: short(day), ok: list.filter((r: any) => !r.late).length, late: list.filter((r: any) => r.late).length }
        }),
        upcoming: leaves.slice(0, 5)
      })
    })()
  }, [tick])

  async function demoOn() {
    setBusy(true); setNote('')
    const { data: emps } = await sb.from('employees').select('id, joining_date').eq('active', true)
    const [h, m] = String(company.work_start_time).split(':').map(Number)
    const start = h * 60 + m
    const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
    const weekend: number[] = company.weekend_days || [0, 6]
    const rows: any[] = []
    for (let back = 1; back <= 14; back++) {
      const day = addDays(today, -back)
      if (weekend.includes(new Date(day + 'T00:00:00Z').getUTCDay())) continue
      for (const e of emps || []) {
        if (Math.random() < 0.12) continue
        const late = Math.random() < 0.2
        const inMin = late ? start + company.late_after_minutes + 1 + Math.floor(Math.random() * 40) : start - 15 + Math.floor(Math.random() * (company.late_after_minutes + 10))
        const outMin = 17 * 60 + Math.floor(Math.random() * 75)
        rows.push({ company_id: company.id, employee_id: e.id, day, check_in: zoned(day, hm(Math.min(inMin, start + company.late_after_minutes)), company.timezone).toISOString(), check_out: zoned(day, hm(outMin), company.timezone).toISOString(), method: 'demo', late })
        if (late) rows[rows.length - 1].check_in = zoned(day, hm(inMin), company.timezone).toISOString()
      }
    }
    const { error } = await sb.from('attendance').upsert(rows, { onConflict: 'employee_id,day', ignoreDuplicates: true })
    setNote(error ? error.message : `Added ${rows.length} demo attendance records.`)
    setBusy(false); setTick(tick + 1)
  }
  async function demoOff() {
    setBusy(true)
    await sb.from('attendance').delete().eq('method', 'demo')
    setNote('Demo attendance removed.'); setBusy(false); setTick(tick + 1)
  }

  if (!d) return <p className="muted">Loading...</p>
  const rate = d.total ? Math.round((d.present / d.total) * 100) : 0
  const ontime = Math.max(0, d.present - d.late)
  const cards: [string, number, string, any, string, string][] = [
    ['Total staff', d.total, 'Active employees', Users, '#E0E7FF', '#4338CA'],
    ['Present today', d.present, `${rate}% turn out`, UserCheck, '#DCFCE7', '#15803D'],
    ['Late arrivals', d.late, `After ${String(company.work_start_time).slice(0, 5)} (+${company.late_after_minutes} min)`, Clock, '#FEF3C7', '#B45309'],
    ['Absent', d.absent, 'Not checked in', UserX, '#FEE2E2', '#B91C1C'],
    ['On leave', d.away, 'Approved time off', CalendarDays, '#E0F2FE', '#0369A1']
  ]
  const hour = new Date().toLocaleString('en-GB', { timeZone: company.timezone, hour: 'numeric', hour12: false })
  const greet = Number(hour) < 12 ? 'Good morning' : Number(hour) < 17 ? 'Good afternoon' : 'Good evening'
  const dateText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: company.timezone })
  const canRate = role === 'admin' || role === 'hr'

  return (
    <>
      <div className="hero2">
        <div>
          <h1>{greet}{name ? ', ' + (name.includes('@') ? name.split('@')[0].replace(/[._-]?\d+$/, '').replace(/[._-]+/g, ' ') : name.split(' ')[0]).replace(/^./, (c: string) => c.toUpperCase()) : ''}</h1>
          <p>{dateText} · {company.name}</p>
        </div>
        <div className="heroside">
          <span><b>{d.present}</b> in today</span><span><b>{d.away}</b> on leave</span><span><b>{d.pending}</b> leave requests</span>
        </div>
      </div>
      {(role === 'admin' || role === 'hr') && !company.ai_provider && (
        <div className="banner">Add your AI key to read scanned CVs and use the Assistant. {role === 'admin' && go ? <button className="linkbtn" onClick={() => go('Settings')}>Add it in Settings</button> : 'Ask your admin to add it in Settings.'}</div>
      )}
      {d.off && <div className="banner">Today is a {d.off === 'weekend' ? 'weekend' : `holiday (${d.off})`}. Absences are not counted.</div>}
      {d.total === 0 && <div className="banner">No employees yet. Add your first employee in the Employees page.</div>}

      <div className="kpis">
        {cards.map(([label, value, hint, Icon, bg, fg]) => (
          <div className="kpi" key={label}>
            <div className="ic" style={{ background: bg, color: fg }}><Icon size={18} /></div>
            <small>{label}</small><b>{value}</b><span className="muted">{hint}</span>
          </div>
        ))}
      </div>

      <div className="dash">
        <div className="card">
          <div className="cardhead"><div><h3>Attendance, last 7 days</h3><p className="muted">Hover a bar to see exact numbers</p></div>
            <div className="legend"><i style={{ background: '#2563EB' }} /> On time <i style={{ background: '#F59E0B' }} /> Late</div></div>
          <Trend days={d.days} />
        </div>
        <div className="card">
          <h3>Today at a glance</h3>
          <div className="donutwrap">
            <Donut total={d.total} parts={[['On time', ontime, '#2563EB'], ['Late', d.late, '#F59E0B'], ['On leave', d.away, '#38BDF8'], ['Absent', d.absent, '#F87171']]} />
            <div className="legendcol">
              {[['On time', ontime, '#2563EB'], ['Late', d.late, '#F59E0B'], ['On leave', d.away, '#38BDF8'], ['Absent', d.absent, '#F87171']].map(([l, v, c]: any) => (
                <div key={l}><i style={{ background: c }} />{l}<b>{v}</b></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(role === 'admin' || role === 'hr' || role === 'viewer') && <PerformanceBoard company={company} canEdit={canRate} />}

      <div className="dash eq">
        <div className="card">
          <h3>Upcoming time off</h3>
          {d.upcoming.length === 0 && <p className="muted">Nobody is on leave soon.</p>}
          {d.upcoming.map((l: any, i: number) => (
            <div className="drow" key={i}><span><b>{l.employees?.name}</b><br /><span className="muted">{short(l.day)} · {l.type} day</span></span></div>
          ))}
        </div>
        <div className="card">
          <h3>Employees by department</h3>
          {Object.keys(d.heads).length === 0 && <p className="muted">No departments yet.</p>}
          {Object.entries(d.heads).map(([n, c]: any) => (
            <div key={n} style={{ margin: '12px 0' }}>
              <div className="barlabel"><span>{n}</span><b>{c}</b></div>
              <div className="bartrack"><div style={{ width: (100 * c) / Math.max(1, d.total) + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="kpis three">
        <div className="kpi"><div className="ic" style={{ background: '#EDE9FE', color: '#6D28D9' }}><Briefcase size={18} /></div><small>Open jobs</small><b>{d.jobs}</b><span className="muted">{d.cands} candidates in total</span></div>
        <div className="kpi"><div className="ic" style={{ background: '#DCFCE7', color: '#15803D' }}><CalendarClock size={18} /></div><small>Upcoming interviews</small><b>{d.ivs}</b><span className="muted">Scheduled</span></div>
        {d.payMonth && <div className="kpi"><div className="ic" style={{ background: '#FFE4E6', color: '#BE123C' }}><Wallet size={18} /></div><small>Last payroll</small><b style={{ fontSize: 24 }}>{d.payTotal.toFixed(0)}</b><span className="muted">{d.payMonth} · {company.currency}</span></div>}
      </div>

      {role === 'admin' && d.total > 0 && (
        <details className="card sample">
          <summary>Sample data tools (for testing only)</summary>
          <p className="muted">Fills the last two weeks with sample attendance so you can test reports and payroll. Sample records are marked "demo" and can be removed at any time.</p>
          <button className="btn" disabled={busy} onClick={demoOn}>Add sample attendance</button>
          <button className="btn ghost" style={{ marginLeft: 8 }} disabled={busy} onClick={demoOff}>Remove sample attendance</button>
          {note && <div className="ok">{note}</div>}
        </details>
      )}
    </>
  )
}
