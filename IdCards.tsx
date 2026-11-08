'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { sb } from '@/lib/supabase'
import { Front, Back } from './IdCard'

export default function IdCards({ company, initialId }: { company: any; initialId?: string }) {
  const [emps, setEmps] = useState<any[]>([])
  const [qrs, setQrs] = useState<Record<string, string>>({})
  const [pick, setPick] = useState(initialId || '')
  const [dept, setDept] = useState('')
  const [depts, setDepts] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const { data } = await sb.from('employees').select('*, departments(name)').eq('active', true).order('employee_code')
      setEmps(data || [])
      const m: Record<string, string> = {}
      for (const e of data || []) m[e.id] = await QRCode.toDataURL(e.qr_token, { margin: 1, width: 300 })
      setQrs(m)
    })()
    sb.from('departments').select('*').order('name').then(({ data }) => setDepts(data || []))
  }, [])

  const list = emps.filter(e => (!pick || e.id === pick) && (!dept || e.department_id === dept))
  return (
    <>
      <div className="card noprint">
        <div className="grid">
          <div><label>Employee</label>
            <select value={pick} onChange={e => setPick(e.target.value)}>
              <option value="">All employees</option>
              {emps.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
            </select></div>
          <div><label>Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)}>
              <option value="">All departments</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
        </div>
        <p className="muted">Cards use your company name, logo and colours from Settings and the employee photo from the Employees page. The QR code is scanned at the kiosk to mark attendance.</p>
        <button className="btn" onClick={() => window.print()}>Print {list.length} card(s)</button>
      </div>
      {list.length === 0 && <p className="muted">No employees to show.</p>}
      <div className="idgrid">
        {list.map(e => (
          <div className="idpair" key={e.id}>
            <Front emp={e} co={company} qr={qrs[e.id]} />
            <Back emp={e} co={company} />
          </div>
        ))}
      </div>
    </>
  )
}
