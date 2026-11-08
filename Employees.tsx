'use client'
import { useEffect, useRef, useState } from 'react'
import { sb } from '@/lib/supabase'
import { resizeImage } from '@/lib/image'
import { startCam, stopCam, loadFace, detectFace } from '@/lib/camera'

const blank: any = { name: '', national_id: '', date_of_birth: '', gender: '', phone: '', email: '', address: '', department_id: '',
  job_title: '', joining_date: '', monthly_salary: '', allowances: '0', tax_percent: '0', emergency_name: '', emergency_phone: '', photo_url: '' }
const FIELDS: [string, string, string][] = [
  ['name', 'Full name', 'text'], ['national_id', 'National ID / passport', 'text'], ['date_of_birth', 'Date of birth', 'date'],
  ['gender', 'Gender', 'select'], ['phone', 'Phone', 'text'], ['email', 'Email', 'email'], ['address', 'Address', 'text'],
  ['department_id', 'Department', 'dept'], ['job_title', 'Designation', 'text'], ['joining_date', 'Joining date', 'date'],
  ['monthly_salary', 'Monthly salary', 'number'], ['allowances', 'Other monthly allowances', 'number'], ['tax_percent', 'Tax / deductions (%)', 'number'],
  ['emergency_name', 'Emergency contact name', 'text'], ['emergency_phone', 'Emergency contact phone', 'text']
]
const TEXT = ['photo_url', 'name', 'national_id', 'gender', 'phone', 'email', 'address', 'job_title', 'emergency_name', 'emergency_phone']
const DATES = ['date_of_birth', 'joining_date', 'department_id']

export default function Employees({ company, onOpenCard }: { company: any; onOpenCard: (id: string) => void }) {
  const [emps, setEmps] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [f, setF] = useState<any>(blank)
  const [editId, setEditId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showFormer, setShowFormer] = useState(false)
  const [enroll, setEnroll] = useState<any>(null)
  const [copied, setCopied] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<any>(null)

  const load = async () => {
    const { data } = await sb.from('employees').select('*, departments(name)').order('employee_code')
    setEmps(data || [])
    sb.from('departments').select('*').order('name').then(({ data: d }) => setDepts(d || []))
  }
  useEffect(() => { load(); return () => stopCam(stream.current) }, [])

  async function save() {
    if (!f.name.trim() || !f.monthly_salary) return setMsg('Enter a name and monthly salary')
    if (Number(f.monthly_salary) < Number(company.min_salary)) return setMsg(`Salary must be at least ${company.min_salary} ${company.currency}`)
    const tp = Number(f.tax_percent) || 0
    if (tp < 0 || tp > 100) return setMsg('Tax must be between 0 and 100')
    if (Number(f.allowances) < 0) return setMsg('Allowances cannot be negative')
    const row: any = { company_id: company.id, monthly_salary: Number(f.monthly_salary), allowances: Number(f.allowances) || 0, tax_percent: tp }
    TEXT.forEach(k => (row[k] = f[k]))
    DATES.forEach(k => (row[k] = f[k] || null))
    const { error } = editId ? await sb.from('employees').update(row).eq('id', editId) : await sb.from('employees').insert(row)
    if (error) return setMsg(error.message)
    setF(blank); setEditId(''); setMsg(''); setFormOpen(false); load()
  }

  async function offboard(e: any) {
    const day = prompt('Last working day (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
    if (!day) return
    const reason = prompt('Reason for leaving (optional)') || ''
    await sb.from('employees').update({ active: false, left_on: day, left_reason: reason }).eq('id', e.id)
    load()
  }
  const reinstate = async (e: any) => { await sb.from('employees').update({ active: true, left_on: null, left_reason: null }).eq('id', e.id); load() }
  const remove = async (e: any) => { if (confirm(`Delete ${e.name} and all their records?`)) { await sb.from('employees').delete().eq('id', e.id); load() } }
  const copy = (e: any) => { navigator.clipboard?.writeText(`${location.origin}/me/${e.qr_token}`); setCopied(e.id); setTimeout(() => setCopied(''), 2000) }
  const edit = (e: any) => {
    const v: any = {}
    Object.keys(blank).forEach(k => (v[k] = e[k] ?? ''))
    setF(v); setEditId(e.id); setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function openEnroll(e: any) {
    setEnroll(e); setMsg('')
    setTimeout(async () => { stream.current = await startCam(video.current as HTMLVideoElement).catch(() => null) }, 100)
  }
  async function capture() {
    setMsg('Looking for a face...')
    const face = await loadFace()
    const det = await detectFace(face, video.current as HTMLVideoElement)
    if (!det) return setMsg('No face found. Look at the camera and try again.')
    await sb.from('employees').update({ face_descriptor: Array.from(det.descriptor) }).eq('id', enroll.id)
    stopCam(stream.current); setEnroll(null); setMsg('Face saved'); load()
  }

  const list = emps.filter(e => (showFormer || e.active) && (!deptFilter || e.department_id === deptFilter) &&
    (e.name + ' ' + (e.employee_code || '')).toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="noprint" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <button className="btn" style={{ marginTop: 0 }} onClick={() => { setFormOpen(!formOpen); setEditId(''); setF(blank) }}>{formOpen ? 'Close form' : 'Add employee'}</button>
      </div>
      {formOpen && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editId ? 'Edit employee' : 'Add employee'}</h3>
          <div className="grid">
            {FIELDS.map(([k, label, type]) => (
              <div key={k}>
                <label>{label}</label>
                {type === 'select' ? (
                  <select value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}><option value="">-</option><option>Male</option><option>Female</option><option>Other</option></select>
                ) : type === 'dept' ? (
                  <select value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}><option value="">None</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                ) : (
                  <input type={type} value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <label>Photo (used on the ID card and payslip)</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {f.photo_url && <img src={f.photo_url} alt="" className="avatar" style={{ objectFit: 'cover' }} />}
            <input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) setF({ ...f, photo_url: await resizeImage(file, 320) }) }} />
          </div>
          {msg && !msg.startsWith('Face saved') && <div className="err">{msg}</div>}
          <button className="btn" onClick={save}>{editId ? 'Update employee' : 'Save employee'}</button>
        </div>
      )}
      {msg.startsWith('Face saved') && <div className="ok">{msg}</div>}
      {enroll && (
        <div className="card">
          <b>Enroll face for {enroll.name}</b>
          <p className="muted">Only enroll with the employee's consent.</p>
          <video ref={video} playsInline muted />
          {msg && <div className="err">{msg}</div>}
          <button className="btn" onClick={capture}>Save face</button>
          <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { stopCam(stream.current); setEnroll(null) }}>Cancel</button>
        </div>
      )}
      <div className="grid" style={{ marginBottom: 8 }}>
        <input placeholder="Search by name or ID" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400, marginBottom: 14 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={showFormer} onChange={e => setShowFormer(e.target.checked)} />Show former employees
      </label>
      {list.length === 0 && <p className="muted">No employees yet. Use "Add employee" above.</p>}
      <div className="empgrid">
        {list.map(e => (
          <div className="empcard" key={e.id} style={{ opacity: e.active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {e.photo_url ? <img src={e.photo_url} alt="" className="avatar" style={{ objectFit: 'cover' }} /> : <div className="avatar">{e.name[0]?.toUpperCase()}</div>}
              <div style={{ minWidth: 0 }}>
                <b>{e.name}</b> <span className="tag">{e.employee_code}</span>
                <div className="muted">{e.job_title || 'No designation'}</div>
              </div>
            </div>
            <div className="muted" style={{ margin: '10px 0' }}>
              {e.departments?.name || 'No department'} · {e.monthly_salary} {company.currency}
              {e.face_descriptor && <> · <span className="tag">Face enrolled</span></>}
              {!e.active && <> · <span className="tag">Left {e.left_on}</span></>}
            </div>
            <div className="empbtns">
              <button className="btn ghost" onClick={() => onOpenCard(e.id)}>ID card</button>
              <button className="btn ghost" onClick={() => edit(e)}>Edit</button>
              <button className="btn ghost" onClick={() => copy(e)}>{copied === e.id ? 'Link copied' : 'Copy portal link'}</button>
              {company.face_enabled && e.active && <button className="btn ghost" onClick={() => openEnroll(e)}>Enroll face</button>}
              {e.active ? <button className="btn ghost" onClick={() => offboard(e)}>Offboard</button> : <button className="btn ghost" onClick={() => reinstate(e)}>Reinstate</button>}
              <button className="btn ghost" onClick={() => remove(e)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
