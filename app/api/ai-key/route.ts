import { NextRequest, NextResponse } from 'next/server'
import { authed } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'
import { detectProvider, defaultModel, testKey, PROVIDER_NAME } from '@/lib/ai'

export const maxDuration = 60

async function log(a: any, action: string, detail: string) {
  await a.db.from('activity_log').insert({ company_id: a.co.id, actor_id: a.user.id, actor_name: a.staff?.name || a.user.email, actor_role: a.role, action, detail })
}

export async function POST(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  const { key, model } = await req.json()
  const k = String(key || '').trim()
  const provider = detectProvider(k)
  if (!provider) return NextResponse.json({ error: 'We could not recognise this key. Gemini keys start with AIza, OpenAI keys with sk-, and Anthropic keys with sk-ant-' }, { status: 400 })
  const useModel = String(model || '').trim() || defaultModel(provider)
  const t = await testKey({ provider, key: k, model: useModel })
  if (!t.ok) return NextResponse.json({ error: `This is a ${PROVIDER_NAME[provider]} key, but it did not work: ${t.error}. If the message mentions the model, open "Model name" below and type the current model name.` }, { status: 400 })
  await a.db.from('company_secrets').upsert({ company_id: a.co.id, ai_key_enc: encrypt(k) })
  await a.db.from('companies').update({ ai_provider: provider, ai_model: String(model || '').trim() || null }).eq('id', a.co.id)
  await log(a, 'Connected AI key', PROVIDER_NAME[provider])
  return NextResponse.json({ ok: true, provider, model: String(model || '').trim() || null })
}

export async function DELETE(req: NextRequest) {
  const a = await authed(req, ['admin', 'hr'])
  if (!a) return NextResponse.json({ error: 'Not allowed for your account, or your session expired' }, { status: 401 })
  await a.db.from('company_secrets').update({ ai_key_enc: null }).eq('company_id', a.co.id)
  await a.db.from('companies').update({ ai_provider: null, ai_model: null }).eq('id', a.co.id)
  await log(a, 'Removed AI key', '')
  return NextResponse.json({ ok: true })
}
