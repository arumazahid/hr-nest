export const localParts = (tz: string, d = new Date()) => {
  const day = d.toLocaleDateString('en-CA', { timeZone: tz })
  const t = d.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false })
  return { day, minutes: +t.slice(0, 2) * 60 + +t.slice(3, 5) }
}

export const distanceM = (a: number, b: number, c: number, d: number) => {
  const r = (x: number) => (x * Math.PI) / 180
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2
  return 12742000 * Math.asin(Math.sqrt(h))
}

export async function mark(db: any, co: any, emp: any, method: string, lat?: number, lng?: number) {
  const { day, minutes } = localParts(co.timezone)
  const { data: row } = await db.from('attendance').select('*').eq('employee_id', emp.id).eq('day', day).maybeSingle()
  const [h, m] = String(co.work_start_time).split(':').map(Number)
  if (!row) {
    const late = minutes > h * 60 + m + co.late_after_minutes
    await db.from('attendance').insert({ company_id: co.id, employee_id: emp.id, day, check_in: new Date().toISOString(), method, late, lat, lng })
    return { message: `${emp.name}: checked in${late ? ' (late)' : ''}`, kind: late ? 'late' : 'in', name: emp.name }
  }
  if (!row.check_out && Date.now() - new Date(row.check_in).getTime() > 3600000) {
    await db.from('attendance').update({ check_out: new Date().toISOString() }).eq('id', row.id)
    return { message: `${emp.name}: checked out`, kind: 'out', name: emp.name }
  }
  return { message: `${emp.name}: already recorded`, kind: 'dup', name: emp.name }
}
