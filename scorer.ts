const SKILLS = ['python', 'java', 'javascript', 'typescript', 'sql', 'excel', 'power bi', 'tableau', 'react', 'node.js',
  'django', 'flask', 'machine learning', 'deep learning', 'nlp', 'data analysis', 'html', 'css', 'git', 'docker', 'aws',
  'communication', 'leadership', 'project management', 'sales', 'marketing', 'seo', 'accounting', 'recruitment',
  'customer service']
const STOP = new Set('a an and are as at be by for from has in is it of on or that the to was we with you your our will this'.split(' '))
const EDU: [number, string, RegExp][] = [
  [4, 'PhD', /\bph\.?d\b|doctorate/],
  [3, "Master's", /\bmasters?\b|\bm\.?sc\b|\bmba\b|\bmphil\b/],
  [2, "Bachelor's", /\bbachelors?\b|\bb\.?sc\b|\bbs\b|\bbba\b|\bbtech\b/],
  [1, 'Diploma', /\bdiploma\b|\bintermediate\b/]
]

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const findSkills = (text: string, extra: string[] = []) => {
  const t = text.toLowerCase()
  return Array.from(new Set([...SKILLS, ...extra])).filter(s => new RegExp('(?<![a-z])' + esc(s) + '(?![a-z])').test(t))
}

export const findYears = (text: string) =>
  Math.max(0, ...Array.from(text.toLowerCase().matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/g)).map(m => +m[1]))

export const findEmail = (text: string) => text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] || ''
export const findPhone = (text: string) => text.match(/\+?\d[\d\s\-]{8,14}\d/)?.[0].trim() || ''
export const guessName = (text: string) => (text.split('\n').map(l => l.trim()).find(Boolean) || 'Unknown').slice(0, 40)

export const findLinks = (text: string) => {
  const out: Record<string, string> = {}
  const li = text.match(/(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/[^\s,;)\]]+/i)
  const gh = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s,;)\]]+/i)
  if (li) out.linkedin = li[0].startsWith('http') ? li[0] : 'https://' + li[0]
  if (gh) out.github = gh[0].startsWith('http') ? gh[0] : 'https://' + gh[0]
  return out
}

const education = (text: string) => {
  const t = text.toLowerCase()
  for (const [lvl, name, re] of EDU) if (re.test(t)) return { lvl, name }
  return { lvl: 0, name: '' }
}

const tokens = (t: string) => (t.toLowerCase().match(/[a-z][a-z+#.\-]+/g) || []).filter(w => !STOP.has(w))

const cosine = (a: string, b: string) => {
  const count = (list: string[]) => list.reduce((m: Record<string, number>, w) => ((m[w] = (m[w] || 0) + 1), m), {})
  const ca = count(tokens(a)), cb = count(tokens(b))
  let dot = 0, na = 0, nb = 0
  new Set([...Object.keys(ca), ...Object.keys(cb)]).forEach(w => {
    const idf = Math.log(3 / (1 + (ca[w] ? 1 : 0) + (cb[w] ? 1 : 0))) + 1
    const x = (ca[w] || 0) * idf, y = (cb[w] || 0) * idf
    dot += x * y; na += x * x; nb += y * y
  })
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export const level = (s: number) => (s >= 80 ? 'Perfect Match' : s >= 65 ? 'Good Match' : s >= 45 ? 'Average' : 'Bad Match')

export function score(job: any, cv: string) {
  const extra: string[] = (job.required_skills || []).map((s: string) => s.toLowerCase())
  const jd = `${job.title} ${job.description} ${job.education !== 'Any' ? 'Education: ' + job.education : ''}`
  const req = Array.from(new Set([...findSkills(jd, extra), ...extra]))
  const have = new Set(findSkills(cv, extra))
  const matched = req.filter(s => have.has(s))
  const missing = req.filter(s => !have.has(s))
  const sim = Math.min(cosine(jd, cv) * 3, 1)
  const years = findYears(cv)
  const need = job.min_experience || findYears(jd)
  const skillPct = req.length ? matched.length / req.length : sim
  const expPct = need ? Math.min(years / need, 1) : 1
  const total = Math.round(1000 * (0.6 * skillPct + 0.25 * sim + 0.15 * expPct)) / 10

  const match: string[][] = [], miss: string[][] = []
  if (need) (years >= need ? match : miss).push(['Experience', `${years} yrs (need ${need})`])
  else if (years) match.push(['Experience', `${years} yrs`])
  const e = education(cv), je = education(jd)
  if (je.lvl) (e.lvl >= je.lvl ? match : miss).push(['Education', `${e.name || 'Not found'} (need ${je.name})`])
  if (matched.length) match.push(['Skills', matched.join(', ')])
  if (missing.length) miss.push(['Skills', missing.join(', ') + ' (missing)'])
  if (!findEmail(cv)) miss.push(['Contact', 'No email found'])

  return { score: total, level: level(total), matched: matched.join(', '), missing: missing.join(', '), details: { match, miss } }
}
