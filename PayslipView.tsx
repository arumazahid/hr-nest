'use client'
import { useEffect } from 'react'
import { Wallet, CalendarDays, Mail, MapPin, Building2, CreditCard, Check, Globe, Info } from 'lucide-react'
import { amountWords } from '@/lib/words'
import { brandVars } from '@/lib/brand'

const money = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const initials = (n: string) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
const fmt = (d: string) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-')

function lines(p: any) {
  const d = p.details || {}
  const earn: [string, number][] = [['Basic Salary', p.basic]]
  if (d.earnItems) {
    d.earnItems.forEach((i: any) => earn.push([i.name, i.amount]))
    if (Number(d.otherAllowance) > 0) earn.push(['Other Allowances', d.otherAllowance])
  } else if (Number(p.allowances) > 0) earn.push(['Allowances', p.allowances])
  if (Number(p.bonus)) earn.push(['Bonus', p.bonus])
  if (Number(p.overtime)) earn.push(['Overtime', p.overtime])
  const ded: [string, number][] = (d.dedItems || []).map((i: any) => [i.name, i.amount])
  ;([['Absent Deduction', p.absent_deduction], ['Unpaid Leave Deduction', p.leave_deduction], ['Late Arrival Deduction', p.late_deduction], ['Income Tax', p.tax]] as [string, number][])
    .forEach(x => Number(x[1]) > 0 && ded.push(x))
  return {
    earn, ded,
    totalE: earn.reduce((s, [, v]) => s + Number(v), 0),
    totalD: ded.reduce((s, [, v]) => s + Number(v), 0)
  }
}

export default function PayslipView({ p, co }: { p: any; co: any }) {
  const e = p.employees, d = p.details || {}
  useEffect(() => { document.title = `Payslip ${e.name} ${p.month}` }, [])
  const { earn, ded, totalE, totalD } = lines(p)
  const month = new Date(p.month + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const vars = brandVars(co)
  const mark = co.logo_url ? <img src={co.logo_url} alt="" style={{ height: 52, maxWidth: 140, objectFit: 'contain' }} /> : <span className="pm-mark">{initials(co.name)[0]}</span>
  const money2 = (v: number) => `${money(v)} ${co.currency}`

  const printCss = co.payslip_template === 'classic'
    ? '@media print{@page{size:A4 landscape;margin:0}html,body{margin:0;background:#fff}.ps{zoom:.82;width:1370px;max-width:none;margin:0;border:0;border-radius:0}}'
    : '@media print{@page{size:A4;margin:0}html,body{margin:0;background:#fff}.pm{zoom:.81;width:980px;max-width:none;margin:0;border:0;border-radius:0;padding-bottom:80px}}'

  if (co.payslip_template === 'classic') {
    return (
      <div className="ps" style={vars}>
        <style>{printCss}</style>
        <svg className="ps-wave" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path d="M0,0 H400 V90 C300,120 220,40 120,30 C70,25 30,10 0,0Z" style={{ fill: 'var(--p)' }} />
          <path d="M120,0 H300 C240,40 180,20 120,0Z" style={{ fill: 'var(--a)' }} />
        </svg>
        <div className="ps-head">
          <div className="logo">{mark}<div><div style={{ fontSize: 24 }}>{co.name}</div><div className="muted" style={{ fontWeight: 400 }}>{co.country}</div></div></div>
          <div style={{ textAlign: 'right', position: 'relative', color: '#fff' }}><div style={{ fontSize: 34, fontWeight: 800 }}>Payslip</div><div style={{ fontWeight: 600 }}>for {month}</div></div>
        </div>
        <div className="ps-emp">
          <div className="ps-photo">{e.photo_url ? <img src={e.photo_url} alt="" /> : <span>{initials(e.name)}</span>}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{e.name}</div>
            <div>{e.job_title}</div><div className="muted">{e.email}</div><div className="muted">Employee ID: {e.employee_code}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div><span className="muted">Department:</span> <b>{e.departments?.name || '-'}</b></div>
            <div><span className="muted">Joining date:</span> <b>{fmt(e.joining_date)}</b></div>
            <div className="muted" style={{ marginTop: 6 }}>Working days {d.workDays} · Present {d.present} · Absent {d.absent} · Leave {d.leaveDays} · Late {d.lates}</div>
          </div>
        </div>
        <div className="ps-cols">
          <div className="ps-col"><div className="ps-colhead">Earnings</div>
            {earn.map(([k, v]) => <div className="ps-line" key={k}><span>{k}</span><b>{money2(v)}</b></div>)}
            <div className="ps-total"><span>Total Earnings</span><b>{money2(totalE)}</b></div></div>
          <div className="ps-col"><div className="ps-colhead">Deductions</div>
            {ded.length === 0 && <div className="ps-line"><span>No deductions</span><b>{money2(0)}</b></div>}
            {ded.map(([k, v]) => <div className="ps-line" key={k}><span>{k}</span><b>{money2(v)}</b></div>)}
            <div className="ps-total"><span>Total Deductions</span><b>{money2(totalD)}</b></div></div>
        </div>
        <div className="ps-net">
          <div><div style={{ fontWeight: 700 }}>Net Pay</div><div className="ps-amount">{money2(p.net)}</div>
            <div style={{ fontSize: 12, color: '#CBD5E1' }}>({amountWords(Number(p.net), co.currency)})</div></div>
          <button className="btn noprint" style={{ marginTop: 0 }} onClick={() => window.print()}>Download Payslip (PDF)</button>
        </div>
        <div className="ps-foot"><span>This is a system generated payslip and does not require a signature.</span><span>Generated on: {fmt(String(p.created_at).slice(0, 10))}</span><span>{co.name}</span></div>
      </div>
    )
  }

  return (
    <div className="pm" style={vars}>
      <style>{printCss}</style>
      <div className="pm-head">
        <div className="pm-brand">{mark}<div><div style={{ fontSize: 28, fontWeight: 800 }}>{co.name}</div>{co.tagline && <div style={{ opacity: .8 }}>{co.tagline}</div>}</div></div>
        <div className="pm-script">{co.tagline || ''}</div>
      </div>
      <div className="pm-pill"><CalendarDays size={22} /> Payroll Month: <span style={{ fontSize: 22 }}>{month}</span></div>
      <div className="pm-title">Payslip</div>
      <div className="pm-sub">Your monthly payroll details</div>
      <div className="pm-emp">
        <div className="pm-photo">{e.photo_url ? <img src={e.photo_url} alt="" /> : <span>{initials(e.name)}</span>}</div>
        <div style={{ flex: 1, minWidth: 190 }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{e.name}</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{e.job_title}</div>
          <div className="pm-ico"><CreditCard size={16} /> Employee ID: {e.employee_code}</div>
          <div className="pm-ico"><Building2 size={16} /> Department: {e.departments?.name || '-'}</div>
        </div>
        <div style={{ flex: 1, minWidth: 190, borderLeft: '2px solid var(--a)', paddingLeft: 18 }}>
          <div className="pm-ico"><CalendarDays size={16} /> Joining Date: {fmt(e.joining_date)}</div>
          <div className="pm-ico"><Mail size={16} /> {e.email || '-'}</div>
          <div className="pm-ico"><MapPin size={16} /> Location: {co.address || co.country || '-'}</div>
        </div>
      </div>
      <div className="pm-cols">
        <div className="pm-card"><div className="pm-chead">Earnings</div>
          {earn.map(([k, v]) => <div className="pm-row" key={k}><span>{k}</span><span>{money2(v)}</span></div>)}
          <div className="pm-tot"><span>Total Earnings</span><span>{money2(totalE)}</span></div></div>
        <div className="pm-card"><div className="pm-chead">Deductions</div>
          {ded.length === 0 && <div className="pm-row"><span>No deductions</span><span>{money2(0)}</span></div>}
          {ded.map(([k, v]) => <div className="pm-row" key={k}><span>{k}</span><span>{money2(v)}</span></div>)}
          <div className="pm-tot"><span>Total Deductions</span><span>{money2(totalD)}</span></div></div>
      </div>
      <div className="pm-net">
        <Wallet size={54} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Net Pay</div>
          <div className="pm-amt">{money2(p.net)}</div>
          <div style={{ fontSize: 13 }}>({amountWords(Number(p.net), co.currency)})</div>
        </div>
        <div className="pm-script" style={{ fontSize: 22 }}>Keep up the great work!</div>
      </div>
      <div className="pm-notes">
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}><Info size={16} style={{ verticalAlign: -3 }} /> Important Notes</div>
          {['This is a system generated payslip and does not require a signature.', 'Your salary has been calculated as per company policy.', 'For any queries, contact the HR Department.']
            .map(t => <div className="pm-ico" key={t}><Check size={15} /> {t}</div>)}
        </div>
        <div style={{ borderLeft: '2px solid var(--a)', paddingLeft: 18, minWidth: 130 }}>
          <div style={{ opacity: .8 }}>Generated On</div><b>{fmt(String(p.created_at).slice(0, 10))}</b>
        </div>
      </div>
      <div className="pm-foot">
        {co.website && <span className="pm-ico"><Globe size={14} /> {co.website}</span>}
        {co.contact_email && <span className="pm-ico"><Mail size={14} /> {co.contact_email}</span>}
        {co.address && <span className="pm-ico"><MapPin size={14} /> {co.address}</span>}
        {!co.website && !co.contact_email && !co.address && <span>{co.name}</span>}
      </div>
      <button className="btn noprint" style={{ display: 'block', margin: '16px auto 0' }} onClick={() => window.print()}>Download Payslip (PDF)</button>
      <svg className="pm-wave" viewBox="0 0 760 80" preserveAspectRatio="none">
        <path d="M0,45 C150,95 300,0 500,42 C620,66 700,30 760,18 V80 H0Z" style={{ fill: 'var(--a)', opacity: .45 }} />
        <path d="M0,62 C160,90 330,30 520,60 C640,78 710,56 760,48 V80 H0Z" style={{ fill: 'var(--a)', opacity: .8 }} />
      </svg>
    </div>
  )
}
