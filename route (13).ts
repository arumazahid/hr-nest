import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { isStrong } from '@/lib/password'

const ROLES = ['admin', 'hr', 'payroll', 'viewer']
const WEAK = 'Password must have 10+ characters with uppercase, lowercase, a number and a symbol'

async function log(a: any, action: string, detail: string) {
  await a.db.from('activity_log').insert({
    company_id: a.co.id, actor_id: a.user.id, actor_name: a.staff?.name || a.user.email, actor_role: a.role, action, detail
  })
}

// HR and admin can see employee sign-up requests waiting for approval.
export async function GET(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const { data } = await a.db.from('staff')
    .select('id, name, email, employee_id, id_verified, created_at')
    .eq('company_id', a.co.id).eq('status', 'pending').eq('role', 'employee').order('created_at')
  return NextResponse.json({ pending: data || [] })
}

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin'])
  if (!a) return NextResponse.json({ error: 'Only an admin can manage users' }, { status: 403 })
  const { name, email, role, password } = await req.json()
  const mail = String(email || '').trim().toLowerCase()
  if (!mail || !ROLES.includes(role)) return NextResponse.json({ error: 'Enter an email and choose a role' }, { status: 400 })
  let userId: string | null = null
  if (password) {
    if (!isStrong(String(password))) return NextResponse.json({ error: WEAK }, { status: 400 })
    const { data, error } = await a.db.auth.admin.createUser({ email: mail, password, email_confirm: true })
    if (error && !/already/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 })
    userId = data?.user?.id || null
  }
  const { error } = await a.db.from('staff').insert({ company_id: a.co.id, email: mail, name, role, user_id: userId })
  if (error) return NextResponse.json({ error: error.message.includes('duplicate') ? 'This email is already added' : error.message }, { status: 400 })
  await log(a, 'Added user', `${name || mail} as ${role}`)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const a = await authed(req, ['admin'])
  if (!a) return NextResponse.json({ error: 'Only an admin can manage users' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id') || ''
  const { data: st } = await a.db.from('staff').select('*').eq('id', id).eq('company_id', a.co.id).maybeSingle()
  if (!st) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  await a.db.from('staff').delete().eq('id', st.id)
  if (st.user_id) await a.db.auth.admin.deleteUser(st.user_id)
  await log(a, 'Removed user', `${st.name || st.email} (${st.role})`)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const { id, action, employeeId, password } = await req.json()
  const { data: st } = await a.db.from('staff').select('*').eq('id', id).eq('company_id', a.co.id).maybeSingle()
  if (!st) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  const who = st.name || st.email

  if (action === 'reset_password') {
    if (a.role !== 'admin') return NextResponse.json({ error: 'Only an admin can reset passwords' }, { status: 403 })
    if (!st.user_id) return NextResponse.json({ error: 'This user has not created an account yet' }, { status: 400 })
    if (!isStrong(String(password || ''))) return NextResponse.json({ error: WEAK }, { status: 400 })
    const { error } = await a.db.auth.admin.updateUserById(st.user_id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await log(a, 'Reset password', who)
    return NextResponse.json({ ok: true })
  }

  // HR may only decide on employee sign-ups, never on other staff accounts.
  if (a.role === 'hr' && st.role !== 'employee') return NextResponse.json({ error: 'Only an admin can change staff accounts' }, { status: 403 })
  if (action === 'approve') {
    const empId = employeeId || st.employee_id
    if (!empId) return NextResponse.json({ error: 'Choose which employee this person is' }, { status: 400 })
    await a.db.from('staff').update({ status: 'active', employee_id: empId }).eq('id', id)
    await log(a, 'Approved sign-up', who)
  } else {
    await a.db.from('staff').update({ status: 'rejected' }).eq('id', id)
    await log(a, 'Rejected sign-up', who)
  }
  return NextResponse.json({ ok: true })
}
