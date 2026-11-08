import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { runPayroll } from '@/lib/payroll'

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'payroll'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { month } = await req.json()
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'Choose a month' }, { status: 400 })
  return NextResponse.json({ count: await runPayroll(a.db, a.co, month) })
}

export async function PATCH(req: NextRequest) {
  const a = await authed(req, ['admin', 'payroll'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { id, bonus, overtime } = await req.json()
  const { data: p } = await a.db.from('payroll').select('*, employees(tax_percent)').eq('id', id).eq('company_id', a.co.id).maybeSingle()
  if (!p) return NextResponse.json({ error: 'Payroll row not found' }, { status: 404 })
  const b = Math.max(0, Number(bonus) || 0), o = Math.max(0, Number(overtime) || 0)
  const gross = Number(p.basic) + Number(p.allowances) + b + o - Number(p.absent_deduction) - Number(p.leave_deduction) - Number(p.late_deduction)
  const pct = Math.min(100, Math.max(0, Number(p.employees?.tax_percent) || 0))
  const tax = Math.round(gross * pct) / 100
  const fixedDed = Number(p.details?.fixedDed) || 0
  await a.db.from('payroll').update({ bonus: b, overtime: o, tax, net: Math.round((gross - tax - fixedDed) * 100) / 100 }).eq('id', id)
  return NextResponse.json({ ok: true })
}
