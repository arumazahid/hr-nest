import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { localParts } from '@/lib/attendance'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr', 'viewer'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
  const { question } = await req.json()
  const { db, co } = a
  const { day } = localParts(co.timezone)
  const q = (t: string, cols: string) => db.from(t).select(cols).eq('company_id', co.id)
  const [emps, att, lv, jobs, sc, pay] = await Promise.all([
    q('employees', 'id,name,job_title').eq('active', true),
    q('attendance', 'employee_id,late').eq('day', day),
    q('leaves', 'employee_id,type').eq('status', 'approved').eq('day', day),
    q('jobs', 'id,title').eq('status', 'open'),
    q('candidate_scores', 'job_id,score,candidates(name)').order('score', { ascending: false }).limit(60),
    q('payroll', 'month,net').order('month', { ascending: false }).limit(300)
  ])
  const name = (id: string) => (emps.data || []).find((e: any) => e.id === id)?.name
  const here = new Set((att.data || []).map((x: any) => x.employee_id))
  const away = new Set((lv.data || []).map((x: any) => x.employee_id))
  const absent = (emps.data || []).filter((e: any) => !here.has(e.id) && !away.has(e.id)).map((e: any) => e.name)
  const month = pay.data?.[0]?.month
  const total = (pay.data || []).filter((p: any) => p.month === month).reduce((s: number, p: any) => s + Number(p.net), 0)
  const hiring = (jobs.data || []).map((j: any) =>
    `${j.title}: ` + (sc.data || []).filter((s: any) => s.job_id === j.id).slice(0, 3).map((s: any) => `${s.candidates?.name} (${s.score})`).join(', '))
  const context = [
    `Company: ${co.name}. Today: ${day}. Currency: ${co.currency}.`,
    `Employees: ${emps.data?.length || 0}. Present today: ${here.size}. Late today: ${(att.data || []).filter((x: any) => x.late).map((x: any) => name(x.employee_id)).join(', ') || 'none'}.`,
    `On leave today: ${Array.from(away).map(name).join(', ') || 'none'}. Absent today: ${absent.join(', ') || 'none'}.`,
    `Latest payroll (${month || 'none yet'}): total net ${total}.`,
    `Open jobs and top candidates: ${hiring.join(' | ') || 'none'}.`
  ].join('\n')
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are the HR assistant for a small company. Answer briefly in plain sentences using only this data. If the data does not contain the answer, say so.\n' + context }] },
      contents: [{ role: 'user', parts: [{ text: String(question) }] }]
    })
  })
  const j = await res.json()
  const answer = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')
  return NextResponse.json({ answer: answer || j?.error?.message || 'No answer received' })
}
