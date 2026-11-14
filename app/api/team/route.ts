import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { localParts } from '@/lib/attendance'

// A manager sees and acts on their own team only: the people in the same department as the manager.
async function loadTeam(a: any) {
  const empId = a.staff?.employee_id
  if (!empId) return null
  const { data: me } = await a.db.from('employees').select('id, name, department_id, departments(name)').eq('id', empId).maybeSingle()
  if (!me) return null
  if (!me.department_id) return { me, dept: null, members: [] as any[] }
  const { data: members } = await a.db.from('employees').select('id, name, job_title, photo_url, employee_code')
    .eq('company_id', a.co.id).eq('department_id', me.department_id).eq('active', true).order('name')
  return { me, dept: (me as any).departments?.name || 'Your team', members: members || [] }
}

const log = (a: any, action: string, detail: string) =>
  a.db.from('activity_log').insert({ company_id: a.co.id, actor_id: a.user.id, actor_name: a.staff?.name || a.user.email, actor_role: a.role, action, detail })

export async function GET(req: NextRequest) {
  const a = await authed(req, ['manager'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const t = await loadTeam(a)
  if (!t) return NextResponse.json({ error: 'Your account is not linked to an employee record. Ask HR.' }, { status: 400 })
  if (!t.dept) return NextResponse.json({ noTeam: true })
  const ids = t.members.map((m: any) => m.id)
  const { day } = localParts(a.co.timezone)
  const month = day.slice(0, 7)
  const [att, away, pending, perf] = await Promise.all([
    a.db.from('attendance').select('employee_id, late').eq('day', day).in('employee_id', ids),
    a.db.from('leaves').select('employee_id').eq('status', 'approved').eq('day', day).in('employee_id', ids),
    a.db.from('leaves').select('id, employee_id, day, type, leave_type, reason, employees(name)').eq('status', 'pending').in('employee_id', ids).order('day').limit(30),
    a.db.from('performance').select('employee_id, rating, notes').eq('month', month).in('employee_id', ids)
  ])
  return NextResponse.json({
    dept: t.dept, month, meId: t.me.id, members: t.members,
    present: att.data || [], away: (away.data || []).map((x: any) => x.employee_id),
    pending: (pending.data || []).filter((l: any) => l.employee_id !== t.me.id), perf: perf.data || []
  })
}

export async function POST(req: NextRequest) {
  const a = await authed(req, ['manager'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const t = await loadTeam(a)
  if (!t || !t.dept) return NextResponse.json({ error: 'You are not in a team yet. Ask HR.' }, { status: 400 })
  const ids = t.members.map((m: any) => m.id)
  const b = await req.json()

  if (b.action === 'leave') {
    if (!['approved', 'rejected'].includes(b.status)) return NextResponse.json({ error: 'Unknown decision' }, { status: 400 })
    const { data: lv } = await a.db.from('leaves').select('id, employee_id, day, employees(name)').eq('id', b.id).maybeSingle()
    if (!lv || !ids.includes(lv.employee_id)) return NextResponse.json({ error: 'This request is not from your team' }, { status: 403 })
    if (lv.employee_id === t.me.id) return NextResponse.json({ error: 'Your own leave is decided by HR' }, { status: 403 })
    await a.db.from('leaves').update({ status: b.status }).eq('id', lv.id)
    await log(a, `Leave ${b.status}`, `${(lv as any).employees?.name} · ${lv.day}`)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'remark') {
    if (!ids.includes(b.employeeId)) return NextResponse.json({ error: 'This person is not in your team' }, { status: 403 })
    const month = localParts(a.co.timezone).day.slice(0, 7)
    const { data: old } = await a.db.from('performance').select('rating, notes').eq('employee_id', b.employeeId).eq('month', month).maybeSingle()
    const row = { company_id: a.co.id, employee_id: b.employeeId, month, rating: 'rating' in b ? b.rating : old?.rating ?? null, notes: 'notes' in b ? String(b.notes || '').slice(0, 500) : old?.notes ?? '' }
    const { error } = await a.db.from('performance').upsert(row, { onConflict: 'employee_id,month' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await log(a, 'Team remark', `${t.members.find((m: any) => m.id === b.employeeId)?.name} · ${month}`)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
