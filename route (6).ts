import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { mark } from '@/lib/attendance'

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { employeeId, method } = await req.json()
  const { data: emp } = await a.db.from('employees').select('*').eq('id', employeeId).eq('company_id', a.co.id).eq('active', true).maybeSingle()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  return NextResponse.json(await mark(a.db, a.co, emp, method))
}
