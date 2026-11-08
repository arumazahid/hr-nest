import dns from 'dns/promises'
import net from 'net'

const blocked = (ip: string) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  }
  const l = ip.toLowerCase()
  return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:')
}

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

export async function fetchPage(raw: string): Promise<{ kind: 'pdf'; buf: Buffer } | { kind: 'html'; text: string; title: string }> {
  let url: URL
  try { url = new URL(raw.trim()) } catch { throw new Error('That is not a valid link') }
  for (let hop = 0; hop < 4; hop++) {
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https links are allowed')
    const addrs = await dns.lookup(url.hostname, { all: true }).catch(() => [])
    if (!addrs.length || addrs.some(a => blocked(a.address))) throw new Error('This link cannot be opened')
    const res = await fetch(url.toString(), { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'HRNestBot/1.0' } })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = new URL(res.headers.get('location') as string, url); continue }
    if (!res.ok) throw new Error(`The site answered with an error (${res.status})`)
    const buf = Buffer.from(await res.arrayBuffer()).subarray(0, 3 * 1024 * 1024)
    if ((res.headers.get('content-type') || '').includes('pdf')) return { kind: 'pdf', buf }
    const html = buf.toString('utf8')
    const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    const text = decode(html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
    if (text.length < 150) throw new Error('This page has almost no readable text. Many portfolio sites need JavaScript to show content. Ask for a PDF CV or a text-based page.')
    return { kind: 'html', text: `${title}\n${text}`, title }
  }
  throw new Error('Too many redirects')
}
