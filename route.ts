import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { fetchPage } from '@/lib/linkfetch'
import { processCv, processText } from '@/lib/process'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { url, jobId } = await req.json()
  const { data: jobs } = await a.db.from('jobs').select('*').eq('company_id', a.co.id).eq('status', 'open')
  if (!jobs?.length) return NextResponse.json({ error: 'Add an open job first' }, { status: 400 })
  try {
    const page = await fetchPage(String(url || ''))
    const r: any = page.kind === 'pdf'
      ? await processCv(a.db, a.co.id, jobs, { name: new URL(url).pathname.split('/').pop() || 'cv.pdf', buf: page.buf }, 'link', jobId || null)
      : await processText(a.db, a.co.id, jobs, page.text, { fileName: url, path: null, sourceUrl: url }, 'link', jobId || null, { name: page.title.slice(0, 60) || undefined })
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json({ ok: true, updated: r.updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
