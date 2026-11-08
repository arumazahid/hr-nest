import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMail } from './mail'

export const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string)

export async function identify(req: NextRequest) {
  const db = admin()
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  const { data: u } = await db.auth.getUser(token)
  const user = u.user
  if (!user) return null
  const { data: owned } = await db.from('companies').select('*').eq('owner_id', user.id).maybeSingle()
  if (owned) return { db, user, co: owned, role: 'admin', status: 'active', staff: null as any }
  const email = (user.email || '').toLowerCase()
  let { data: st } = await db.from('staff').select('*, companies(*)').eq('user_id', user.id).maybeSingle()
  if (!st && email) {
    const { data: byMail } = await db.from('staff').select('*, companies(*)').eq('email', email).is('user_id', null).maybeSingle()
    if (byMail) { await db.from('staff').update({ user_id: user.id }).eq('id', byMail.id); st = byMail }
  }
  const code = String(user.user_metadata?.join_code || '').trim().toUpperCase()
  if (!st && code) {
    const { data: c } = await db.from('companies').select('*').eq('join_code', code).maybeSingle()
    if (!c) return { db, user, co: null, role: null, status: 'badcode', staff: null as any }
    const ecode = String(user.user_metadata?.employee_code || '').trim().toUpperCase()
    let emp: any = null
    if (ecode) emp = (await db.from('employees').select('id, name').eq('company_id', c.id).eq('employee_code', ecode).maybeSingle()).data
    // The employee ID is mandatory: a stranger who only knows the company code cannot even send a request.
    if (!emp) return { db, user, co: null, role: null, status: 'badid', staff: null as any }
    const { data: ins } = await db.from('staff').insert({
      company_id: c.id, user_id: user.id, email, name: user.user_metadata?.full_name || emp.name || email,
      role: 'employee', status: 'pending', employee_id: emp.id, id_verified: true
    }).select('*, companies(*)').single()
    st = ins
    if (ins) {
      const to = c.contact_email || c.imap_email
      await sendMail(db, c, to, `${c.name}: new employee sign-up needs your approval`,
        `${ins.name} (${email}) created an HR Nest account with Employee ID ${ecode}.\n\nThe ID matches ${emp.name} in your employee list.\nOpen HR Nest and approve or reject the request:\n${req.nextUrl.origin}/\n\nIf you do not recognise this person, reject the request.`)
    }
  }
  if (!st) return { db, user, co: null, role: null, status: 'none', staff: null as any }
  return { db, user, co: st.companies, role: st.role as string, status: st.status as string, staff: st }
}

export async function authed(req: NextRequest, roles?: string[]) {
  const a = await identify(req)
  if (!a || !a.co || a.status !== 'active' || (roles && !roles.includes(a.role as string))) return null
  return { db: a.db, co: a.co, role: a.role as string, user: a.user, staff: a.staff }
}
