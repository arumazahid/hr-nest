import { localParts } from './attendance'

const r2 = (n: number) => Math.round(n * 100) / 100
const sum = (list: any[]) => list.reduce((s, l) => s + (l.type === 'half' ? 0.5 : 1), 0)

export async function runPayroll(db: any, co: any, month: string) {
  const [y, mo] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  const today = localParts(co.timezone).day
  const from = `${month}-01`, to = `${month}-${String(last).padStart(2, '0')}`
  const { data: hol } = await db.from('holidays').select('day').eq('company_id', co.id).gte('day', from).lte('day', to)
  const off = new Set((hol || []).map((h: any) => h.day))
  const weekend: number[] = co.weekend_days || [0, 6]
  const days: string[] = []
  for (let d = 1; d <= last; d++) {
    const dt = new Date(Date.UTC(y, mo - 1, d))
    const iso = dt.toISOString().slice(0, 10)
    if (!weekend.includes(dt.getUTCDay()) && !off.has(iso)) days.push(iso)
  }
  const { data: emps } = await db.from('employees').select('*').eq('company_id', co.id).eq('active', true)
  const { data: comps } = await db.from('pay_components').select('*').eq('company_id', co.id)
  const { data: old } = await db.from('payroll').select('employee_id, bonus, overtime').eq('company_id', co.id).eq('month', month)
  const extra = new Map((old || []).map((p: any) => [p.employee_id, p]))
  const { data: att } = await db.from('attendance').select('*').eq('company_id', co.id).gte('day', from).lte('day', to)
  const { data: lv } = await db.from('leaves').select('*').eq('company_id', co.id).eq('status', 'approved').gte('day', `${y}-01-01`).lte('day', to)

  const rows = (emps || []).map((e: any) => {
    const mine = (att || []).filter((a: any) => a.employee_id === e.id)
    const ml = (lv || []).filter((l: any) => l.employee_id === e.id)
    const thisMonth = ml.filter((l: any) => l.day >= from)
    const present = new Set(mine.map((a: any) => a.day))
    const fullLeave = new Set(thisMonth.filter((l: any) => l.type === 'full').map((l: any) => l.day))
    let unpaid = sum(thisMonth.filter((l: any) => l.leave_type === 'unpaid'))
    for (const [t, quota] of [['annual', co.annual_leaves], ['sick', co.sick_leaves]] as [string, number][]) {
      const before = sum(ml.filter((l: any) => l.leave_type === t && l.day < from))
      const now = sum(thisMonth.filter((l: any) => l.leave_type === t))
      unpaid += Math.max(0, now - Math.max(0, quota - before))
    }
    const absent = days.filter(d => d <= today && d >= (e.joining_date || '0000') && !present.has(d) && !fullLeave.has(d)).length
    const lates = mine.filter((a: any) => a.late).length
    const halfDays = Math.floor(lates / Math.max(1, co.lates_per_half_day))
    const basic = Number(e.monthly_salary)
    const daily = basic / days.length
    const absentDed = absent * daily
    const leaveDed = unpaid * daily
    const lateDed = halfDays * 0.5 * daily
    const items = (comps || []).map((c: any) => ({
      name: c.name, kind: c.kind, amount: r2(c.calc === 'percent' ? (basic * Number(c.value)) / 100 : Number(c.value))
    }))
    const earnItems = items.filter((i: any) => i.kind === 'earning')
    const dedItems = items.filter((i: any) => i.kind === 'deduction')
    const otherAllowance = Number(e.allowances)
    const allowances = r2(otherAllowance + earnItems.reduce((s: number, i: any) => s + i.amount, 0))
    const fixedDed = r2(dedItems.reduce((s: number, i: any) => s + i.amount, 0))
    const bonus = Number(extra.get(e.id)?.bonus || 0), overtime = Number(extra.get(e.id)?.overtime || 0)
    const gross = basic + allowances + bonus + overtime - absentDed - leaveDed - lateDed
    const pct = Math.min(100, Math.max(0, Number(e.tax_percent) || 0))
    const tax = (gross * pct) / 100
    return {
      company_id: co.id, employee_id: e.id, month, basic, allowances, bonus, overtime,
      absent_deduction: r2(absentDed), leave_deduction: r2(leaveDed), late_deduction: r2(lateDed), tax: r2(tax),
      net: r2(gross - tax - fixedDed),
      details: { workDays: days.length, present: present.size, absent, leaveDays: sum(thisMonth), unpaidLeave: unpaid, lates, halfDays, earnItems, dedItems, fixedDed, otherAllowance }
    }
  })
  if (rows.length) await db.from('payroll').upsert(rows, { onConflict: 'employee_id,month' })
  return rows.length
}
