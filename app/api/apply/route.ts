import { NextRequest, NextResponse } from 'next/server'
import { admin } from '@/lib/auth'
import { processCv } from '@/lib/process'

export const runtime = 'nodejs'
export const maxDuration = 60

async function findJob(slug: string) {
  const db = admin()
  const { data: job } = await db.from('jobs').select('*, companies(name)').eq('slug', slug).eq('status', 'open').maybeSingle()
  return { db, job }
}

export async function GET(req: NextRequest) {
  const { job } = await findJob(req.nextUrl.searchParams.get('slug') || '')
  if (!job) return NextResponse.json({ error: 'This job is closed or does not exist' }, { status: 404 })
  return NextResponse.json({ title: job.title, description: job.description, company: job.companies.name })
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const { db, job } = await findJob(String(form.get('slug') || ''))
  if (!job) return NextResponse.json({ error: 'This job is closed or does not exist' }, { status: 404 })
  const file = form.get('file') as File
  if (!file || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Upload a CV under 4 MB' }, { status: 400 })
  const { data: jobs } = await db.from('jobs').select('*').eq('company_id', job.company_id).eq('status', 'open')
  const r: any = await processCv(db, job.company_id, jobs || [], { name: file.name, buf: Buffer.from(await file.arrayBuffer()) },
    'apply', job.id, { name: String(form.get('name') || ''), email: String(form.get('email') || '') })
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
