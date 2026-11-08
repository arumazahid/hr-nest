import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { processCv } from '@/lib/process'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { db, co } = a
  const form = await req.formData()
  const jobId = (form.get('jobId') as string) || null
  const { data: jobs } = await db.from('jobs').select('*').eq('company_id', co.id).eq('status', 'open')
  if (!jobs?.length) return NextResponse.json({ error: 'Add an open job first' }, { status: 400 })
  const results = []
  for (const f of form.getAll('files') as File[]) {
    const buf = Buffer.from(await f.arrayBuffer())
    results.push(await processCv(db, co.id, jobs, { name: f.name, buf }, 'upload', jobId))
  }
  return NextResponse.json({ results })
}
