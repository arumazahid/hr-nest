import { brandVars } from '@/lib/brand'
const initials = (n: string) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
const fmt = (d: string) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-')

function Mark({ co }: { co: any }) {
  return co.logo_url ? <img className="idc-logo" src={co.logo_url} alt="" /> : <span className="idc-mark">{initials(co.name)[0] || '✓'}</span>
}

export function Front({ emp, co, qr }: { emp: any; co: any; qr: string }) {
  const rows: [string, string][] = [
    ['Employee ID', emp.employee_code || '-'], ['Department', emp.departments?.name || '-'],
    ['Joining Date', fmt(emp.joining_date)], ['Email', emp.email || '-']
  ]
  return (
    <div className="idc" style={brandVars(co)}>
      <div className="idc-blob1" /><div className="idc-blob2" />
      <div className="idc-head"><Mark co={co} /><b>{co.name}</b></div>
      <div className="idc-photo">{emp.photo_url ? <img src={emp.photo_url} alt="" /> : <span>{initials(emp.name)}</span>}</div>
      <div className="idc-name">{emp.name}</div>
      <div className="idc-role">{emp.job_title || 'Employee'}</div>
      <div className="idc-rows">
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
      </div>
      <div className="idc-bottom">
        <div className="idc-qr">{qr && <img src={qr} alt="" />}<span>Scan at the kiosk to mark attendance</span></div>
        <div className="idc-sign"><i />Authorized Signature</div>
      </div>
      <div className="idc-foot">{co.name}</div>
    </div>
  )
}

export function Back({ emp, co }: { emp: any; co: any }) {
  const rows: [string, string][] = [
    ['Full Name', emp.name], ['Designation', emp.job_title || '-'], ['Department', emp.departments?.name || '-'],
    ['Company', co.name], ['Employee ID', emp.employee_code || '-'], ['Joining Date', fmt(emp.joining_date)],
    ['Email', emp.email || '-'], ['Phone', emp.phone || '-']
  ]
  return (
    <div className="idc back" style={brandVars(co)}>
      <div className="idc-top"><Mark co={co} /><b>{co.name}</b></div>
      <div className="idc-card2">
        <h4>Employee Details</h4>
        {rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
      </div>
      <div className="idc-notes">
        <h4>Important Notes</h4>
        <ul>
          <li>This ID is for authorized use only.</li>
          <li>Keep your ID secure and do not share it.</li>
          <li>Report any loss or damage immediately.</li>
        </ul>
      </div>
      <div className="idc-foot">{co.name}</div>
    </div>
  )
}
