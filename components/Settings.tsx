'use client'
import { useState } from 'react'
import { sb } from '@/lib/supabase'
import { resizeImage } from '@/lib/image'
import PasswordInput from './PasswordInput'
import { toast } from './Toast'
import { logActivity } from '@/lib/activity'

const FIELDS: [string, string, string][] = [
  ['name', 'Company name', 'text'],
  ['country', 'Country', 'text'],
  ['currency', 'Currency', 'text'],
  ['min_salary', 'Minimum monthly salary', 'number'],
  ['annual_leaves', 'Annual leaves per year', 'number'],
  ['sick_leaves', 'Sick leaves per year', 'number'],
  ['work_start_time', 'Work starts at', 'time'],
  ['late_after_minutes', 'Counted late after (minutes)', 'number'],
  ['lates_per_half_day', 'Late arrivals that equal one half-day', 'number'],
  ['weekend_days', 'Weekend days (0=Sunday ... 6=Saturday, comma separated)', 'text'],
  ['timezone', 'Timezone (for example Asia/Karachi)', 'text'],
  ['office_lat', 'Office latitude', 'number'],
  ['office_lng', 'Office longitude', 'number'],
  ['office_radius_m', 'Allowed distance from office (meters)', 'number'],
  ['brand_primary', 'Brand colour (dark, used for text and headers)', 'color'],
  ['brand_accent', 'Accent colour (highlights and bars)', 'color'],
  ['tagline', 'Tagline (shown on payslips)', 'text'],
  ['website', 'Website', 'text'],
  ['contact_email', 'HR contact email (shown on documents)', 'email'],
  ['hr_name', 'HR / admin name (signs the emails to candidates)', 'text'],
  ['hr_title', 'HR / admin job title (for example HR Manager)', 'text'],
  ['reply_to_email', 'Replies from candidates go to this email (optional, can be your personal email)', 'email'],
  ['address', 'Address / location (shown on documents)', 'text'],
  ['phone', 'Phone (shown on letters)', 'text'],
  ['imap_email', 'Gmail inbox that receives CVs', 'email']
]
const NULLABLE = ['office_lat', 'office_lng']

export default function Settings({ company, onSaved }: { company: any; onSaved: (c: any) => void }) {
  const [f, setF] = useState<any>(company)
  const [pw, setPw] = useState('')
    const [mail, setMail] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const upd = (p: any) => { setF((x: any) => ({ ...x, ...p })); setDirty(true) }

  async function call(body: any) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/inbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  async function save() {
    setSaving(true)
    const patch: any = {}
    FIELDS.forEach(([k, , t]) => (patch[k] = t === 'number' ? (NULLABLE.includes(k) && (f[k] === '' || f[k] == null) ? null : Number(f[k])) : f[k]))
    patch.logo_url = f.logo_url || null
    patch.payslip_template = f.payslip_template || 'modern'
    patch.face_enabled = !!f.face_enabled
    patch.gps_enabled = !!f.gps_enabled
    patch.weekend_days = String(f.weekend_days ?? '0,6').split(',').map((x: string) => Number(x.trim())).filter((n: number) => n >= 0 && n <= 6)
    const { data, error } = await sb.from('companies').update(patch).eq('id', company.id).select().single()
    if (error) { setSaving(false); return toast('Could not save: ' + error.message, 'err') }
    if (pw.trim()) { await call({ action: 'save', password: pw }); setPw('') }
    onSaved({ ...data, has_imap_password: !!pw.trim() || !!company.has_imap_password })
    setF(data); setDirty(false); setSaving(false)
    toast('Settings saved successfully')
    logActivity(company.id, 'Changed settings', 'Business settings updated')
  }

  async function check() {
    setMail('Checking inbox...')
    const out = await call({ action: 'check' })
    setMail(out.error || `Done. ${out.added} new CV(s) added.`)
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Business settings</h3>
        <p className="muted">Attendance and payroll will use these rules once those modules are added.</p>
        <div className="grid">
          {FIELDS.map(([k, label, type]) => (
            <div key={k}>
              <label>{label}</label>
              <input type={type} value={f[k] ?? ''} onChange={e => upd({ [k]: e.target.value })} />
            </div>
          ))}
          <div>
            <label>Company logo (shown on ID cards and payslips)</label>
            <input type="file" accept="image/*" onChange={async e => {
              const file = e.target.files?.[0]
              if (file) upd({ logo_url: await resizeImage(file, 240, 'image/png', false) })
            }} />
            {f.logo_url && <img src={f.logo_url} alt="" style={{ height: 44, marginTop: 8 }} />}
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => navigator.geolocation.getCurrentPosition(
              p => upd({ office_lat: p.coords.latitude, office_lng: p.coords.longitude }),
              () => toast('Location access was blocked', 'err'))}>Use my current location as the office</button>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={!!f.gps_enabled} onChange={e => upd({ gps_enabled: e.target.checked })} />
            Allow phone check-in with GPS
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={!!f.face_enabled} onChange={e => upd({ face_enabled: e.target.checked })} />
            Allow face recognition (only with employee consent)
          </label>
          <div>
            <label>Gmail app password {company.has_imap_password ? '(saved, type to replace)' : ''}</label>
            <PasswordInput value={pw} onChange={v => { setPw(v); setDirty(true) }} autoComplete="new-password" />
          </div>
        </div>
        <div className="grid" style={{ marginTop: 6 }}>
          <div>
            <label>Payslip design</label>
            <select value={f.payslip_template || 'modern'} onChange={e => upd({ payslip_template: e.target.value })}>
              <option value="modern">Modern (portrait, like a printed slip)</option>
              <option value="classic">Classic (landscape)</option>
            </select>
          </div>
        </div>
      </div>
      <div className={'savebar' + (dirty ? ' dirty' : '')}>
        <span>{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
        <button className="btn" style={{ marginTop: 0 }} disabled={!dirty || saving} onClick={save}>{saving ? 'Saving...' : 'Save changes'}</button>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>CV inbox</h3>
        <p className="muted">Put the job title in the email subject so the CV is linked to that job. Every CV is still scored against all open jobs.</p>
        <button className="btn ghost" onClick={check}>Check inbox now</button>
        {mail && <div className={mail.startsWith('Done') ? 'ok' : 'muted'} style={{ marginTop: 10 }}>{mail}</div>}
      </div>
    </>
  )
}
