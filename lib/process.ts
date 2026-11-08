import mammoth from 'mammoth'
import { score, findYears, findEmail, findPhone, findLinks, guessName } from './scorer'

const MIME: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }
const ext = (name: string) => name.toLowerCase().split('.').pop() || ''

async function ocr(name: string, buf: Buffer) {
  const key = process.env.GEMINI_API_KEY
  const mime = MIME[ext(name)]
  if (!mime) return { text: '', error: 'This file has no readable text' }
  if (!key) return { text: '', error: 'No text found. If this is a scanned CV, add GEMINI_API_KEY in the Vercel settings so scanned files can be read' }
  let error = ''
  for (const model of Array.from(new Set([process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-2.5-flash']))) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [
          { text: 'Extract all text from this CV exactly as written. Return only the text.' },
          { inline_data: { mime_type: mime, data: buf.toString('base64') } }
        ] }] })
      })
      const j = await res.json()
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')
      if (text.trim()) return { text, error: '' }
      error = j?.error?.message || 'The reader returned no text'
    } catch (e: any) { error = e.message }
  }
  return { text: '', error: `Could not read this file (${error.slice(0, 140)})` }
}

export async function readText(name: string, buf: Buffer) {
  let text = ''
  try {
    if (ext(name) === 'pdf') text = (await (await import('pdf-parse/lib/pdf-parse.js' as any)).default(buf)).text
    else if (ext(name) === 'docx') text = (await mammoth.extractRawText({ buffer: buf })).value
  } catch {}
  if (text.trim().length >= 50) return { text, error: '' }
  return ocr(name, buf)
}

export async function processText(db: any, companyId: string, jobs: any[], text: string,
  meta: { fileName: string; path: string | null; sourceUrl?: string }, source: string, jobId: string | null, who: { name?: string; email?: string } = {}) {
  const email = (who.email || findEmail(text)).toLowerCase()
  const row = {
    company_id: companyId, name: who.name || guessName(text), email, phone: findPhone(text), file_name: meta.fileName,
    file_path: meta.path, cv_text: text, years: findYears(text), source, applied_job_id: jobId,
    links: { ...findLinks(text), ...(meta.sourceUrl ? { source_url: meta.sourceUrl } : {}) }
  }
  let id = '', updated = false
  if (email) {
    const { data: ex } = await db.from('candidates').select('id').eq('company_id', companyId).eq('email', email).maybeSingle()
    if (ex) {
      id = ex.id; updated = true
      const { error } = await db.from('candidates').update(row).eq('id', id)
      if (error) return { file: meta.fileName, error: error.message }
      await db.from('candidate_scores').delete().eq('candidate_id', id)
    }
  }
  if (!updated) {
    const { data: c, error } = await db.from('candidates').insert(row).select('id').single()
    if (error) return { file: meta.fileName, error: error.message }
    id = c.id
  }
  await db.from('candidate_scores').insert(jobs.map(j => {
    const s = score(j, text)
    return { company_id: companyId, candidate_id: id, job_id: j.id, score: s.score, level: s.level, matched_skills: s.matched, missing_skills: s.missing, details: s.details }
  }))
  return { file: meta.fileName, ok: true, updated }
}

export async function processCv(db: any, companyId: string, jobs: any[], file: { name: string; buf: Buffer },
  source: string, jobId: string | null, who: { name?: string; email?: string } = {}) {
  const { text, error } = await readText(file.name, file.buf)
  if (text.trim().length < 50) return { file: file.name, error: error || 'No readable text found in this file' }
  const path = `${companyId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
  await db.storage.from('cvs').upload(path, file.buf)
  return processText(db, companyId, jobs, text, { fileName: file.name, path }, source, jobId, who)
}
