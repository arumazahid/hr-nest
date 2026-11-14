import { decrypt } from './crypto'

export type Provider = 'gemini' | 'openai' | 'anthropic'
export type Ai = { provider: Provider; key: string; model: string }

export const PROVIDER_NAME: Record<Provider, string> = { gemini: 'Google Gemini', openai: 'OpenAI', anthropic: 'Anthropic Claude' }

// Model names change over time. Defaults can be replaced without a code change:
// per company in Settings, or for everyone with GEMINI_MODEL / OPENAI_MODEL / ANTHROPIC_MODEL in Vercel.
export const defaultModel = (p: Provider) =>
  p === 'gemini' ? process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    : p === 'openai' ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
      : process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'

export function detectProvider(key: string): Provider | null {
  const k = key.trim()
  if (k.startsWith('sk-ant-')) return 'anthropic'
  if (k.startsWith('AIza')) return 'gemini'
  if (k.startsWith('sk-')) return 'openai'
  return null
}

export async function loadAi(db: any, companyId: string): Promise<Ai | null> {
  const [{ data: co }, { data: sec }] = await Promise.all([
    db.from('companies').select('ai_provider, ai_model').eq('id', companyId).maybeSingle(),
    db.from('company_secrets').select('ai_key_enc').eq('company_id', companyId).maybeSingle()
  ])
  if (co?.ai_provider && sec?.ai_key_enc) {
    try { return { provider: co.ai_provider, key: decrypt(sec.ai_key_enc), model: co.ai_model || defaultModel(co.ai_provider) } } catch { return null }
  }
  // Only if the platform owner switches it on: everyone without a key then shares the owner's key (and cost).
  if (process.env.PLATFORM_AI_FALLBACK === '1' && process.env.GEMINI_API_KEY) return { provider: 'gemini', key: process.env.GEMINI_API_KEY, model: defaultModel('gemini') }
  return null
}

async function post(url: string, headers: Record<string, string>, body: any, ms = 45000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms)
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: c.signal })
    return { ok: r.ok, j: await r.json().catch(() => ({})) as any }
  } catch (e: any) {
    return { ok: false, j: { error: { message: e?.name === 'AbortError' ? 'The AI service took too long to answer' : e?.message } } }
  } finally { clearTimeout(t) }
}
const errText = (j: any) => String(j?.error?.message || j?.error || 'unknown error').slice(0, 160)

type Part = { kind: 'text'; text: string } | { kind: 'file'; mime: string; data: string; name: string }

async function run(ai: Ai, system: string, parts: Part[], maxTokens = 4096): Promise<{ text: string; error: string }> {
  if (ai.provider === 'gemini') {
    const { ok, j } = await post(`https://generativelanguage.googleapis.com/v1beta/models/${ai.model}:generateContent`, { 'x-goog-api-key': ai.key }, {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: [{ role: 'user', parts: parts.map(p => (p.kind === 'text' ? { text: p.text } : { inline_data: { mime_type: p.mime, data: p.data } })) }]
    })
    const text = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')
    return { text, error: text ? '' : ok ? 'The AI returned no text' : errText(j) }
  }
  if (ai.provider === 'openai') {
    const content = parts.map(p => p.kind === 'text' ? { type: 'text', text: p.text }
      : p.mime === 'application/pdf' ? { type: 'file', file: { filename: p.name, file_data: `data:${p.mime};base64,${p.data}` } }
        : { type: 'image_url', image_url: { url: `data:${p.mime};base64,${p.data}` } })
    const { ok, j } = await post('https://api.openai.com/v1/chat/completions', { Authorization: 'Bearer ' + ai.key }, {
      model: ai.model, messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content }]
    })
    const text = j?.choices?.[0]?.message?.content || ''
    return { text, error: text ? '' : ok ? 'The AI returned no text' : errText(j) }
  }
  const content = parts.map(p => p.kind === 'text' ? { type: 'text', text: p.text }
    : p.mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: p.mime, data: p.data } }
      : { type: 'image', source: { type: 'base64', media_type: p.mime, data: p.data } })
  const { ok, j } = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': ai.key, 'anthropic-version': '2023-06-01' }, {
    model: ai.model, max_tokens: maxTokens, ...(system ? { system } : {}), messages: [{ role: 'user', content }]
  })
  const text = (j?.content || []).map((p: any) => p.text || '').join('')
  return { text, error: text ? '' : ok ? 'The AI returned no text' : errText(j) }
}

export const generateText = (ai: Ai, system: string, user: string) => run(ai, system, [{ kind: 'text', text: user }], 1024)

export const readFileText = (ai: Ai, name: string, mime: string, buf: Buffer) =>
  run(ai, '', [{ kind: 'text', text: 'Extract all text from this CV exactly as written. Return only the text.' }, { kind: 'file', mime, data: buf.toString('base64'), name }])

export async function testKey(ai: Ai) {
  const r = await run({ ...ai }, '', [{ kind: 'text', text: 'Reply with the single word OK' }], 20)
  return { ok: !!r.text, error: r.error }
}
