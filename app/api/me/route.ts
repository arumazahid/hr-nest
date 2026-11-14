import { NextRequest, NextResponse } from 'next/server'
import { identify } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const a = await identify(req)
  if (!a || !a.co) return NextResponse.json({ company: null, role: null, status: a?.status || 'none' })
  if (a.status !== 'active') return NextResponse.json({ company: { name: a.co.name }, role: a.role, status: a.status })
  const { owner_avatar, owner_name, ...co } = a.co
  const profile = a.staff
    ? { id: a.user.id, name: a.staff.name || a.user.email, avatar: a.staff.avatar_url || null }
    : { id: a.user.id, name: owner_name || a.user.email, avatar: owner_avatar || null }
  if (a.role === 'employee' || a.role === 'manager') {
    return NextResponse.json({ status: 'active', role: a.role, profile, company: { id: co.id, name: co.name, currency: co.currency, timezone: co.timezone, brand_primary: co.brand_primary, brand_accent: co.brand_accent } })
  }
  const { data: sec } = await a.db.from('company_secrets').select('company_id').eq('company_id', a.co.id).maybeSingle()
  return NextResponse.json({ status: 'active', role: a.role, profile, company: { ...co, has_imap_password: !!sec } })
}
