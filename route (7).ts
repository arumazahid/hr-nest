import { NextRequest, NextResponse } from 'next/server'
import { admin, authed } from '@/lib/auth'
import { balance } from '@/lib/leave'
import { localParts } from '@/lib/attendance'

const safe = (co: any) => ({
  name: co.name, country: co.country, currency: co.currency, logo_url: co.logo_url, brand_primary: co.brand_primary,
  brand_accent: co.brand_accent, tagline: co.tagline, website: co.website, contact_email: co.contact_email,
  address: co.address, payslip_template: co.payslip_template
})

async function who(req: NextRequest, token: string) {
  if (token) {
    const db = admin()
    const { data: emp } = await db.from('employees').select('*, companies(*)').eq('qr_token', token).eq('active', true).maybeSingle()
    return { db, emp }
  }
  const a = await authed(req)
  if (!a || a.role !== 'employee' || !a.staff?.employee_id) return { db: admin(), emp: null }
  const { data: emp } = await a.db.from('employees').select('*, companies(*)').eq('id', a.staff.employee_id).eq('active', true).maybeSingle()
  return { db: a.db, emp }
}

export async function GET(req: NextRequest) {
  const { db, emp } = await who(req, req.nextUrl.searchParams.get('token') || '')
  if (!emp) return NextResponse.json({ error: 'No employee record is linked to this account yet. Ask your admin.' }, { status: 404 })
  const co = emp.companies
  const pid = req.nextUrl.searchParams.get('payslip')
  if (pid) {
    const { data: p } = await db.from('payroll').select('*, employees(name, job_title, email, employee_code, joining_date, photo_url, departments(name))').eq('id', pid).eq('employee_id', emp.id).maybeSingle()
    if (!p) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })
    return NextResponse.json({ p, co: safe(co) })
  }
  const { data: slips } = await db.from('payroll').select('id, month, net').eq('employee_id', emp.id).order('month', { ascending: false }).limit(12)
  const today = localParts(co.timezone).day
  const { data: leaves } = await db.from('leaves').select('*').eq('employee_id', emp.id).order('day', { ascending: false }).limit(60)
  const { data: att } = await db.from('attendance').select('day, check_in, check_out, late').eq('employee_id', emp.id).order('day', { ascending: false }).limit(31)
  const { data: perf } = await db.from('performance').select('month, rating, notes').eq('employee_id', emp.id).order('month', { ascending: false }).limit(3)
  const month = (att || []).filter((a: any) => a.day >= today.slice(0, 7) + '-01')
  return NextResponse.json({
    name: emp.name, code: emp.employee_code, company: co.name, token: emp.qr_token, tz: co.timezone,
    gps: co.gps_enabled && co.office_lat != null,
    balance: balance(co, leaves || [], today.slice(0, 4)),
    leaves: (leaves || []).slice(0, 15), currency: co.currency, slips: slips || [],
    perf: (perf || []).filter((p: any) => p.rating || p.notes), recent: (att || []).slice(0, 8), present: month.length, late: month.filter((a: any) => a.late).length
  })
}

export async function POST(req: NextRequest) {
  const { token, day, leave_type, type, reason } = await req.json()
  const { db, emp } = await who(req, String(token || ''))
  if (!emp) return NextResponse.json({ error: 'No employee record is linked to this account' }, { status: 404 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return NextResponse.json({ error: 'Choose a date' }, { status: 400 })
  if (!['annual', 'sick', 'unpaid'].includes(leave_type) || !['full', 'half'].includes(type))
    return NextResponse.json({ error: 'Choose the leave type' }, { status: 400 })
  if (day < localParts(emp.companies.timezone).day) return NextResponse.json({ error: 'You cannot request leave for a past date' }, { status: 400 })
  await db.from('leaves').delete().eq('employee_id', emp.id).eq('day', day).eq('status', 'rejected')
  const { error } = await db.from('leaves').insert({
    company_id: emp.company_id, employee_id: emp.id, day, leave_type, type, reason: String(reason || '').slice(0, 200), status: 'pending'
  })
  if (error) return NextResponse.json({ error: error.message.includes('duplicate') ? 'You already have a request for that date' : error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
