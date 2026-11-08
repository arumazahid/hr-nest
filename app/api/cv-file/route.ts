import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr', 'viewer'])
  if (!a) return NextResponse.json({ error: 'Not allowed' }, { status: 401 })
  const { data: c } = await a.db.from('candidates').select('file_path, links').eq('id', req.nextUrl.searchParams.get('id') || '').eq('company_id', a.co.id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  if (c.file_path) {
    const { data } = await a.db.storage.from('cvs').createSignedUrl(c.file_path, 300)
    if (data?.signedUrl) return NextResponse.json({ url: data.signedUrl })
  }
  if (c.links?.source_url) return NextResponse.json({ url: c.links.source_url })
  return NextResponse.json({ error: 'No file saved for this candidate' }, { status: 404 })
}
