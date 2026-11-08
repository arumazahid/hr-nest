'use client'
import { useEffect, useState } from 'react'
import { MessageCircle, Plus, CheckCircle2, Trash2, Send } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { toast } from './Toast'

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + ' min ago'
  if (m < 1440) return Math.round(m / 60) + ' h ago'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const roleTag = (r: string) => (r === 'admin' || r === 'hr' ? <span className="tag warn">HR team</span> : <span className="tag">{r === 'employee' ? 'Employee' : r}</span>)

export default function Community({ company, profile, role }: { company: any; profile: any; role: string }) {
  const isHr = role === 'admin' || role === 'hr'
  const [threads, setThreads] = useState<any[]>([])
  const [open, setOpen] = useState<any>(null)
  const [replies, setReplies] = useState<any[]>([])
  const [asking, setAsking] = useState(false)
  const [q, setQ] = useState({ title: '', body: '' })
  const [text, setText] = useState('')
  const me = { id: profile?.id, name: profile?.name || 'Someone' }

  const loadThreads = async () => {
    const { data } = await sb.from('discussion_threads').select('*, discussion_replies(count)').order('created_at', { ascending: false }).limit(200)
    setThreads(data || [])
  }
  const loadReplies = async (id: string) => {
    const { data } = await sb.from('discussion_replies').select('*').eq('thread_id', id).order('created_at')
    setReplies(data || [])
  }
  useEffect(() => { loadThreads() }, [])
  useEffect(() => { if (open) loadReplies(open.id) }, [open?.id])

  async function ask() {
    if (!q.title.trim()) return toast('Write your question first', 'err')
    const { data, error } = await sb.from('discussion_threads').insert({ company_id: company.id, author_id: me.id, author_name: me.name, author_role: role, title: q.title.trim(), body: q.body.trim() }).select().single()
    if (error) return toast(error.message, 'err')
    setQ({ title: '', body: '' }); setAsking(false); toast('Your question is posted'); await loadThreads(); setOpen(data)
  }
  async function reply() {
    if (!text.trim() || !open) return
    const { error } = await sb.from('discussion_replies').insert({ thread_id: open.id, company_id: company.id, author_id: me.id, author_name: me.name, author_role: role, body: text.trim() })
    if (error) return toast(error.message, 'err')
    if (isHr && open.status === 'open') { await sb.from('discussion_threads').update({ status: 'answered' }).eq('id', open.id); setOpen({ ...open, status: 'answered' }) }
    setText(''); loadReplies(open.id); loadThreads()
  }
  async function setStatus(status: string) {
    await sb.from('discussion_threads').update({ status }).eq('id', open.id)
    setOpen({ ...open, status }); loadThreads(); toast(status === 'answered' ? 'Marked as answered' : 'Reopened')
  }
  async function remove(kind: 'thread' | 'reply', id: string) {
    if (!confirm(kind === 'thread' ? 'Delete this whole question?' : 'Delete this reply?')) return
    await sb.from(kind === 'thread' ? 'discussion_threads' : 'discussion_replies').delete().eq('id', id)
    if (kind === 'thread') { setOpen(null); loadThreads() } else loadReplies(open.id)
  }

  return (
    <>
      <div className="hero2 slim light">
        <div><h1>Community</h1><p>A friendly place to ask questions. HR and your teammates answer here. Only people from {company.name} can see it.</p></div>
        <button className="btn" style={{ marginTop: 0 }} onClick={() => { setAsking(true); setOpen(null) }}><Plus size={16} /> Ask a question</button>
      </div>
      <div className="commgrid">
        <div className="commlist">
          {threads.length === 0 && <div className="card emptycomm"><MessageCircle size={28} /><b>No questions yet</b><span className="muted">Be the first to ask something.</span></div>}
          {threads.map(t => (
            <button key={t.id} className={'thread' + (open?.id === t.id ? ' on' : '')} onClick={() => { setOpen(t); setAsking(false) }}>
              <div className="threadtop"><b>{t.title}</b>{t.status === 'answered' && <span className="tag ok">Answered</span>}</div>
              <div className="muted">{t.author_name} · {ago(t.created_at)} · {t.discussion_replies?.[0]?.count || 0} replies</div>
            </button>
          ))}
        </div>
        <div>
          {asking && (
            <div className="card">
              <h3>Ask a question</h3>
              <label>Your question</label><input placeholder="For example: When will the offer letter be ready?" value={q.title} onChange={e => setQ({ ...q, title: e.target.value })} />
              <label>More details (optional)</label><textarea rows={5} value={q.body} onChange={e => setQ({ ...q, body: e.target.value })} />
              <button className="btn" onClick={ask}>Post question</button>
              <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => setAsking(false)}>Cancel</button>
            </div>
          )}
          {!asking && !open && <div className="card emptycomm"><MessageCircle size={32} /><b>Pick a question on the left</b><span className="muted">or ask a new one.</span></div>}
          {open && (
            <div className="card">
              <div className="cardhead">
                <div><h3>{open.title}</h3><p className="muted">{open.author_name} {roleTag(open.author_role)} · {ago(open.created_at)}</p></div>
                <div className="actrow">
                  {isHr && (open.status === 'open'
                    ? <button className="btn sm good" onClick={() => setStatus('answered')}><CheckCircle2 size={15} /> Mark answered</button>
                    : <button className="btn ghost sm" onClick={() => setStatus('open')}>Reopen</button>)}
                  {(isHr || open.author_id === me.id) && <button className="ib bad" title="Delete" onClick={() => remove('thread', open.id)}><Trash2 size={16} /></button>}
                </div>
              </div>
              {open.body && <p className="postbody">{open.body}</p>}
              <div className="replies">
                {replies.map(r => (
                  <div className={'reply' + (r.author_role === 'admin' || r.author_role === 'hr' ? ' hr' : '')} key={r.id}>
                    <div className="avatar sm">{r.author_name[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div><b>{r.author_name}</b> {roleTag(r.author_role)} <span className="muted">{ago(r.created_at)}</span></div>
                      <div className="postbody">{r.body}</div>
                    </div>
                    {(isHr || r.author_id === me.id) && <button className="ib" title="Delete reply" onClick={() => remove('reply', r.id)}><Trash2 size={14} /></button>}
                  </div>
                ))}
                {replies.length === 0 && <p className="muted">No replies yet.</p>}
              </div>
              <div className="replybox">
                <input placeholder="Write a reply..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && reply()} />
                <button className="btn sm" onClick={reply}><Send size={15} /> Reply</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
