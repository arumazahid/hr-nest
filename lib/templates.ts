export type Tpl = { subject: string; body: string }

export const KINDS: [string, string][] = [
  ['interview', 'Interview invitation'],
  ['selected', 'Selection'],
  ['rejected', 'Rejection (soft)']
]

export const PLACEHOLDERS = ['name', 'position', 'company', 'address', 'phone', 'date', 'time', 'mode', 'place', 'interviewer', 'notes', 'reason', 'hr_name', 'hr_title', 'reply_email']

const SIGN = `Kind regards,
{hr_name}
{hr_title}
{company}
{phone}`

export const DEFAULTS: Record<string, Tpl> = {
  interview: {
    subject: 'Interview invitation: {position} at {company}',
    body: `Dear {name},

Thank you for applying for the position of {position} at {company}. We were impressed by your profile and would like to invite you for an interview.

Date: {date}
Time: {time}
Type: {mode}
Place or link: {place}
Company address: {address}
Interviewer: {interviewer}

{notes}

Please reply to this email to confirm that you can attend. If this time does not suit you, let us know and we will arrange another.

${SIGN}`
  },
  selected: {
    subject: 'Congratulations, you have been selected at {company}',
    body: `Dear {name},

Congratulations! After your interview, we are delighted to offer you the position of {position} at {company}.

Our HR team will contact you shortly with your offer letter and joining details. If you have any questions in the meantime, simply reply to this email.

Welcome to the team.

${SIGN}`
  },
  rejected: {
    subject: 'Your application for {position} at {company}',
    body: `Dear {name},

Thank you for the time you spent applying for {position} at {company}, and for speaking with us.

After careful review, we have decided not to move forward with your application at this time. The main reason is that {reason}.

This is not a judgement of your potential, and we truly appreciate your interest in {company}. If you feel we have made a mistake, or you would like to share more about your experience, please reply to this email and we will gladly take another look.

We wish you every success ahead.

${SIGN}`
  }
}

const REASON = 'we are moving forward with candidates whose experience matches the current requirements more closely'

export function buildVars(co: any, cand: any, o: any = {}) {
  const longDate = (d: string) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '')
  const t12 = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }
  const mode: Record<string, string> = { 'in-person': 'In person', online: 'Online', phone: 'Phone call' }
  return {
    name: cand?.name || 'there', position: o.position || 'the open position', company: co.name || '', address: co.address || '', phone: co.phone || '',
    date: longDate(o.date), time: t12(o.time), mode: o.mode ? mode[o.mode] || o.mode : '', place: o.place || '', interviewer: o.interviewer || '',
    notes: o.notes || '', reason: (o.reason || '').trim() || REASON,
    hr_name: co.hr_name || '', hr_title: co.hr_title || '', reply_email: co.reply_to_email || co.contact_email || ''
  } as Record<string, string>
}

// Fills {placeholders}. Lines that only held an empty placeholder (or a label with an empty value) are dropped.
export function fillTemplate(t: Tpl, vars: Record<string, string>): Tpl {
  const f = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
  const body = t.body.split('\n').map(line => ({ raw: line, out: f(line) }))
    .filter(l => !(/\{\w+\}/.test(l.raw) && (l.out.trim() === '' || /^[^:\n]{1,40}:\s*$/.test(l.out.trim()))))
    .map(l => l.out).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { subject: f(t.subject), body }
}
