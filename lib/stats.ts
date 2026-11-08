import { units } from './leave'

const r2 = (n: number) => Math.round(n * 100) / 100

export function monthStats(co: any, month: string, emps: any[], att: any[], lv: any[], hol: any[]) {
  const [y, mo] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: co.timezone })
  const off = new Set(hol.map((h: any) => h.day))
  const weekend: number[] = co.weekend_days || [0, 6]
  const days: string[] = []
  for (let d = 1; d <= last; d++) {
    const dt = new Date(Date.UTC(y, mo - 1, d))
    const iso = dt.toISOString().slice(0, 10)
    if (!weekend.includes(dt.getUTCDay()) && !off.has(iso) && iso <= today) days.push(iso)
  }
  return emps.map(e => {
    const mine = att.filter(a => a.employee_id === e.id)
    const ml = lv.filter(l => l.employee_id === e.id && l.status === 'approved')
    const present = new Set(mine.map(a => a.day))
    const fullLeave = new Set(ml.filter(l => l.type === 'full').map(l => l.day))
    const list = days.filter(d => d >= (e.joining_date || '0000'))
    const absent = list.filter(d => !present.has(d) && !fullLeave.has(d)).length
    const late = mine.filter(a => a.late).length
    const hours = mine.reduce((s, a) => s + (a.check_out ? (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 3600000 : 0), 0)
    const attPct = list.length ? Math.min(100, Math.round((100 * present.size) / list.length)) : 0
    const punct = present.size ? Math.round((100 * (present.size - late)) / present.size) : 0
    return {
      emp: e, workDays: list.length, present: present.size, late, absent,
      leaveDays: ml.reduce((s, l) => s + units(l), 0), hours: r2(hours), attPct, punct,
      score: Math.round(0.6 * attPct + 0.4 * punct)
    }
  })
}
