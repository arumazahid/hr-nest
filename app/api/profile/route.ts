import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const a = await authed(req)
  if (!a) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { name, avatar } = await req.json()
  const clean = String(name || '').trim().slice(0, 80)
  if (!clean) return NextResponse.json({ error: 'Enter your name' }, { status: 400 })
  if (avatar && (!/^data:image\/(png|jpeg|webp);base64,/.test(avatar) || avatar.length > 400000))
    return NextResponse.json({ error: 'Choose a smaller picture (PNG or JPG)' }, { status: 400 })
  if (a.staff) {
    const patch: any = { name: clean }
    if (avatar !== undefined) patch.avatar_url = avatar || null
    await a.db.from('staff').update(patch).eq('id', a.staff.id)
  } else {
    const patch: any = { owner_name: clean }
    if (avatar !== undefined) patch.owner_avatar = avatar || null
    await a.db.from('companies').update(patch).eq('id', a.co.id)
  }
  return NextResponse.json({ ok: true })
}
