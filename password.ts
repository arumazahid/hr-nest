export const RULES: [string, (p: string) => boolean][] = [
  ['At least 10 characters', p => p.length >= 10],
  ['One uppercase letter', p => /[A-Z]/.test(p)],
  ['One lowercase letter', p => /[a-z]/.test(p)],
  ['One number', p => /\d/.test(p)],
  ['One symbol (for example @ # $ !)', p => /[^A-Za-z0-9]/.test(p)]
]

export function checkPassword(p: string) {
  const met = RULES.map(([label, test]) => ({ label, ok: test(p || '') }))
  const score = met.filter(m => m.ok).length
  const label = !p ? '' : score <= 2 ? 'Weak' : score <= 4 ? 'Almost there' : 'Strong'
  return { met, score, label, ok: score === RULES.length }
}

export const isStrong = (p: string) => checkPassword(p).ok

export function generatePassword(len = 14) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@#$%&*!?']
  const all = sets.join('')
  const rnd = (n: number) => {
    const a = new Uint32Array(1)
    globalThis.crypto.getRandomValues(a)
    return a[0] % n
  }
  const out = sets.map(s => s[rnd(s.length)])
  while (out.length < len) out.push(all[rnd(all.length)])
  for (let i = out.length - 1; i > 0; i--) { const j = rnd(i + 1); [out[i], out[j]] = [out[j], out[i]] }
  return out.join('')
}
