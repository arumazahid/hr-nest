'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import { brandVars } from '@/lib/brand'
import { words } from '@/lib/words'
import { toast } from './Toast'
import { logActivity } from '@/lib/activity'

const fmt = (d: string) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '[date]')
const ordinal = (n: number) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10])
const longDate = () => { const d = new Date(); return `${ordinal(d.getDate())} ${d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}` }

function duration(a: string, b: string) {
  if (!a || !b) return '[period]'
  const d1 = new Date(a), d2 = new Date(b)
  let m = (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth()
  let days = d2.getDate() - d1.getDate()
  if (days < 0) { m--; days += new Date(d2.getFullYear(), d2.getMonth(), 0).getDate() }
  const y = Math.floor(m / 12); m %= 12
  const parts = [y && `${words(y).toLowerCase()} year${y > 1 ? 's' : ''}`, m && `${words(m).toLowerCase()} month${m > 1 ? 's' : ''}`, days && `${words(days).toLowerCase()} day${days > 1 ? 's' : ''}`].filter(Boolean) as string[]
  return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0] || 'less than a day'
}

const PRONOUN: Record<string, [string, string, string]> = { he: ['Mr.', 'He', 'his'], she: ['Ms.', 'She', 'her'], they: ['', 'They', 'their'] }

export default function Letters({ company }: { company: any }) {
  const [type, setType] = useState('offer')
  const [emps, setEmps] = useState<any[]>([])
  const [cands, setCands] = useState<any[]>([])
  const [f, setF] = useState<any>({
    name: '', position: '', start: '', left: '', salary: '', extra: '', salaryNote: '', duties: '', policy: '', closing: '',
    sign: 'HR Department', signTitle: 'Human Resources', who: 'he', conduct: '', resigned: true,
    dept: '', reportsTo: '', probation: '3 months', hours: '', place: '', acceptBy: '', ref: ''
  })

  useEffect(() => {
    sb.from('employees').select('id, name, job_title, joining_date, left_on, monthly_salary').order('name').then(({ data }) => setEmps(data || []))
    sb.from('candidates').select('id, name').order('created_at', { ascending: false }).limit(300).then(({ data }) => setCands(data || []))
    sb.from('letter_defaults').select('data').maybeSingle().then(({ data }) => data?.data && setF((x: any) => ({ ...x, ...data.data })))
  }, [])

  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  const pickEmp = (id: string) => {
    const e = emps.find(x => x.id === id)
    if (e) setF((x: any) => ({ ...x, name: e.name, position: e.job_title || '', start: e.joining_date || '', left: e.left_on || '', salary: e.monthly_salary || '' }))
  }
  async function saveDefaults() {
    const data = { policy: f.policy, closing: f.closing, salaryNote: f.salaryNote, sign: f.sign, signTitle: f.signTitle, conduct: f.conduct, probation: f.probation, hours: f.hours }
    const { error } = await sb.from('letter_defaults').upsert({ company_id: company.id, data })
    error ? toast(error.message, 'err') : toast('Saved. These will be filled in automatically next time.')
  }

  const [title, hs, pos] = PRONOUN[f.who]
  const c = company.name
  const lines = (t: string) => t.split('\n').map((x: string) => x.trim()).filter(Boolean)

  return (
    <>
      <style>{'@media print{@page{size:A4;margin:0}html,body{margin:0;background:#fff}}'}</style>
      <div className="card noprint">
        <div className="grid">
          <div><label>Letter</label>
            <select value={type} onChange={e => setType(e.target.value)}><option value="offer">Offer letter</option><option value="experience">Experience letter</option></select></div>
          <div><label>{type === 'offer' ? 'Fill from a candidate or employee' : 'Fill from an employee'}</label>
            <select defaultValue="" onChange={e => { const v = e.target.value; emps.some(x => x.id === v) ? pickEmp(v) : set('name', cands.find(x => x.id === v)?.name || '') }}>
              <option value="">Choose</option>
              {type === 'offer' && cands.map(x => <option key={x.id} value={x.id}>{x.name} (candidate)</option>)}
              {emps.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select></div>
          <div><label>Name</label><input value={f.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label>Position</label><input value={f.position} onChange={e => set('position', e.target.value)} /></div>
          <div><label>{type === 'offer' ? 'Joining date' : 'Joining date'}</label><input type="date" value={f.start} onChange={e => set('start', e.target.value)} /></div>
          {type === 'experience' && <div><label>Last working day</label><input type="date" value={f.left} onChange={e => set('left', e.target.value)} /></div>}
          {type === 'offer' && <div><label>Basic salary ({company.currency})</label><input value={f.salary} onChange={e => set('salary', e.target.value)} /></div>}
          {type === 'experience' && <div><label>Refer to the person as</label>
            <select value={f.who} onChange={e => set('who', e.target.value)}><option value="he">Mr. (he, his)</option><option value="she">Ms. (she, her)</option><option value="they">No title (they, their)</option></select></div>}
          <div><label>Signed by</label><input value={f.sign} onChange={e => set('sign', e.target.value)} /></div>
          <div><label>Signer title</label><input value={f.signTitle} onChange={e => set('signTitle', e.target.value)} /></div>
          {type === 'offer' && <>
            <div><label>Department</label><input value={f.dept} onChange={e => set('dept', e.target.value)} /></div>
            <div><label>Reporting to</label><input value={f.reportsTo} onChange={e => set('reportsTo', e.target.value)} /></div>
            <div><label>Probation period</label><input value={f.probation} onChange={e => set('probation', e.target.value)} /></div>
            <div><label>Working hours</label><input placeholder="for example 9:00 AM to 6:00 PM, Monday to Friday" value={f.hours} onChange={e => set('hours', e.target.value)} /></div>
            <div><label>Place of work</label><input value={f.place} onChange={e => set('place', e.target.value)} /></div>
            <div><label>Please accept by</label><input type="date" value={f.acceptBy} onChange={e => set('acceptBy', e.target.value)} /></div>
          </>}
          <div><label>Reference no. (optional)</label><input value={f.ref} onChange={e => set('ref', e.target.value)} /></div>
        </div>
        {type === 'offer' ? (
          <>
            <label>Other salary lines (one per line, for example "Performance Commission: As per assigned targets.")</label>
            <textarea rows={2} value={f.extra} onChange={e => set('extra', e.target.value)} />
            <label>Note under the salary (optional)</label>
            <textarea rows={2} value={f.salaryNote} onChange={e => set('salaryNote', e.target.value)} />
            <label>Role and responsibilities</label>
            <textarea rows={3} value={f.duties} onChange={e => set('duties', e.target.value)} />
            <label>Attendance and leave policy (one point per line)</label>
            <textarea rows={4} value={f.policy} onChange={e => set('policy', e.target.value)} />
            <label>Closing paragraph</label>
            <textarea rows={3} value={f.closing} onChange={e => set('closing', e.target.value)} />
          </>
        ) : (
          <>
            <label>Responsibilities (what the person did)</label>
            <textarea rows={3} value={f.duties} onChange={e => set('duties', e.target.value)} />
            <label>Conduct paragraph (leave empty for the standard text)</label>
            <textarea rows={3} value={f.conduct} onChange={e => set('conduct', e.target.value)} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.resigned} onChange={e => set('resigned', e.target.checked)} />Add the line that the person resigned and served the notice period</label>
          </>
        )}
        <button className="btn" onClick={() => { logActivity(company.id, type === 'offer' ? 'Printed offer letter' : 'Printed experience letter', f.name); window.print() }}>Print or save as PDF</button>
        <button className="btn ghost" style={{ marginLeft: 8 }} onClick={saveDefaults}>Save policy, closing and note as my company defaults</button>
              </div>

      <div className="a4wrap">
        <div className="a4" style={brandVars(company)}>
          <header className="a4-head">
            <div className="a4-brand">
              {company.logo_url ? <img src={company.logo_url} alt="" /> : <span className="idc-mark" style={{ width: 52, height: 52, fontSize: 26 }}>{c[0]}</span>}
              <div><b>{c.toUpperCase()}</b>{company.tagline && <small>{company.tagline.toUpperCase()}</small>}</div>
            </div>
            <div className="a4-contact">
              {company.address && <div>{company.address}</div>}
              {company.phone && <div>{company.phone}</div>}
              {company.contact_email && <div>{company.contact_email}</div>}
            </div>
          </header>
          <div className="a4-rule" />
          <main className="a4-body">
            <div className="a4-meta"><span>{f.ref ? 'Ref: ' + f.ref : ''}</span><span>Date: {longDate()}</span></div>
            {type === 'offer' ? (
              <>
                <h1 className="a4-title">OFFER LETTER</h1>
                <p>Dear <b>{f.name || '[Name]'}</b>,</p>
                <p>We are pleased to offer you the position of <b>{f.position || '[Position]'}</b> at {c}. We were impressed by your skills and experience and believe you will be a valuable part of our team. Your employment will begin on <b>{fmt(f.start)}</b>.</p>
                <table className="a4-table">
                  <tbody>
                    <tr><th>Position</th><td>{f.position || '-'}</td></tr>
                    {f.dept && <tr><th>Department</th><td>{f.dept}</td></tr>}
                    {f.reportsTo && <tr><th>Reporting to</th><td>{f.reportsTo}</td></tr>}
                    <tr><th>Joining date</th><td>{fmt(f.start)}</td></tr>
                    {f.place && <tr><th>Place of work</th><td>{f.place}</td></tr>}
                    {f.hours && <tr><th>Working hours</th><td>{f.hours}</td></tr>}
                    {f.probation && <tr><th>Probation</th><td>{f.probation}</td></tr>}
                  </tbody>
                </table>
                <h3 className="a4-h">Compensation</h3>
                <table className="a4-table">
                  <tbody>
                    <tr><th>Basic salary (monthly)</th><td>{company.currency} {Number(f.salary || 0).toLocaleString('en-US')}/-</td></tr>
                    {lines(f.extra).map((l: string, i: number) => { const [k, ...v] = l.split(':'); return v.length ? <tr key={i}><th>{k.trim()}</th><td>{v.join(':').trim()}</td></tr> : <tr key={i}><td colSpan={2}>{l}</td></tr> })}
                  </tbody>
                </table>
                {f.salaryNote && <p className="a4-note">{f.salaryNote}</p>}
                {f.duties && <><h3 className="a4-h">Role and responsibilities</h3><p>{f.duties}</p></>}
                {lines(f.policy).length > 0 && <><h3 className="a4-h">Attendance and leave policy</h3><ul>{lines(f.policy).map((l: string, i: number) => <li key={i}>{l}</li>)}</ul></>}
                {f.closing && <p>{f.closing}</p>}
                <p>Please sign and return a copy of this letter{f.acceptBy ? <> by <b>{fmt(f.acceptBy)}</b></> : ''} to confirm your acceptance. We look forward to welcoming you to the team.</p>
                <div className="a4-sign">
                  <div><div className="line" /><b>{f.sign}</b><div>{f.signTitle}</div><div>{c}</div></div>
                  <div><div className="line" /><b>Accepted by</b><div>{f.name || '[Name]'}</div><div>Signature and date</div></div>
                </div>
              </>
            ) : (
              <>
                <h1 className="a4-title">EXPERIENCE LETTER</h1>
                <p className="a4-center"><b>TO WHOM IT MAY CONCERN</b></p>
                <p>This is to certify that <b>{title} {f.name || '[Name]'}</b> worked with {c} as {/^[aeiou]/i.test(f.position) ? 'an' : 'a'} <b>{f.position || '[Position]'}</b> for a period of {duration(f.start, f.left)}, from <b>{fmt(f.start)}</b> to <b>{fmt(f.left)}</b>.</p>
                {f.duties && <p>{f.duties}</p>}
                <p>{f.conduct || `${hs} was hardworking, cooperative, punctual, and professional in ${pos} conduct, and maintained good working relationships with colleagues.`}</p>
                {f.resigned && <p>{hs} voluntarily resigned from {pos} position and duly served {pos} required notice period in accordance with the organization&apos;s policies.</p>}
                <p>We appreciate {pos} contributions and wish {f.who === 'they' ? 'them' : f.who === 'she' ? 'her' : 'him'} success in {pos} future endeavors.</p>
                <div className="a4-sign">
                  <div><div className="line" /><b>{f.sign}</b><div>{f.signTitle}</div><div>{c}</div></div>
                  <div className="a4-stamp">Company stamp</div>
                </div>
              </>
            )}
          </main>
          <footer className="a4-foot">{[company.website, company.contact_email, company.phone].filter(Boolean).join('   |   ') || c}</footer>
        </div>
      </div>
    </>
  )
}
