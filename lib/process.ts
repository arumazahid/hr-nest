import mammoth from 'mammoth'
import { readFileText, loadAi, PROVIDER_NAME, type Ai } from './ai'
import { score, findYears, findEmail, findPhone, findLinks, guessName } from './scorer'

const MIME: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }
const ext = (name: string) => name.toLowerCase().split('.').pop() || ''

async function ocr(name: string, buf: Buffer, getAi?: () => Promise<Ai | null>) {
  const mime = MIME[ext(name)]
  if (!mime) return { text: '', error: 'This file has no readable text' }
  const ai = getAi ? await getAi() : null
  if (!ai) return { text: '', error: 'This looks like a scanned or image CV. Add your AI key in Settings so scanned files can be read (CVs made in Word or Google Docs do not need one)' }
  const r = await readFileText(ai, name, mime, buf)
  return r.text.trim() ? { text: r.text, error: '' } : { text: '', error: `Could not read this file with ${PROVIDER_NAME[ai.provider]} (${r.error}). Check your AI key and model in Settings` }
}

export async function readText(name: string, buf: Buffer, getAi?: () => Promise<Ai | null>) {
  let text = ''
  try {
    if (ext(name) === 'pdf') text = (await (await import('pdf-parse/lib/pdf-parse.js' as any)).default(buf)).text
    else if (ext(name) === 'docx') text = (await mammoth.extractRawText({ buffer: buf })).value
  } catch {}
  if (text.trim().length >= 50) return { text, error: '' }
  return ocr(name, buf, getAi)
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
  const { text, error } = await readText(file.name, file.buf, () => loadAi(db, companyId))
  if (text.trim().length < 50) return { file: file.name, error: error || 'No readable text found in this file' }
  const path = `${companyId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
  await db.storage.from('cvs').upload(path, file.buf)
  return processText(db, companyId, jobs, text, { fileName: file.name, path }, source, jobId, who)
}
