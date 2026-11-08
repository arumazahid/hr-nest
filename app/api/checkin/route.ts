import { NextRequest, NextResponse } from 'next/server'
import { admin } from '@/lib/auth'
import { mark, distanceM } from '@/lib/attendance'

export async function POST(req: NextRequest) {
  const { token, lat, lng } = await req.json()
  const db = admin()
  const { data: emp } = await db.from('employees').select('*, companies(*)').eq('qr_token', String(token)).eq('active', true).maybeSingle()
  if (!emp) return NextResponse.json({ error: 'This link is not valid' }, { status: 404 })
  const co = emp.companies
  if (!co.gps_enabled || co.office_lat == null || co.office_lng == null)
    return NextResponse.json({ error: 'Phone check-in is not set up for this company' }, { status: 400 })
  if (typeof lat !== 'number' || typeof lng !== 'number') return NextResponse.json({ error: 'Location is missing' }, { status: 400 })
  const d = distanceM(lat, lng, co.office_lat, co.office_lng)
  if (d > co.office_radius_m) return NextResponse.json({ error: `You are ${Math.round(d)} m from the office. Move closer to check in.` }, { status: 403 })
  return NextResponse.json(await mark(db, co, emp, 'gps', lat, lng))
}
