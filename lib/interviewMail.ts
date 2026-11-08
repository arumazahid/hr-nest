export function whenText(iso: string, tz: string) {
  return new Date(iso).toLocaleString('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' })
}

function details(co: any, iv: any, jobTitle?: string | null) {
  return [
    jobTitle ? `Position: ${jobTitle}` : '',
    `Date and time: ${whenText(iv.scheduled_at, co.timezone)}`,
    `Type: ${iv.mode}`,
    iv.place ? `Place or link: ${iv.place}` : '',
    iv.interviewer ? `Interviewer: ${iv.interviewer}` : '',
    iv.notes ? `\n${iv.notes}` : ''
  ].filter(Boolean).join('\n')
}

export function inviteMail(co: any, name: string, iv: any, jobTitle?: string | null) {
  return {
    subject: `Interview invitation from ${co.name}`,
    text: `Hello ${name},\n\nWe would like to invite you for an interview.\n\n${details(co, iv, jobTitle)}\n\nPlease reply to this email to confirm.\n\n${co.name}${co.phone ? '\n' + co.phone : ''}`
  }
}

export function selectedMail(co: any, name: string, iv: any, jobTitle?: string | null) {
  return {
    subject: `Congratulations, you have been selected at ${co.name}`,
    text: `Hello ${name},\n\nThank you for interviewing with us. We are happy to tell you that you have been selected${jobTitle ? ` for the position of ${jobTitle}` : ''}.\n\nOur HR team will contact you shortly with your offer letter and joining details.\n\nYour interview details, for reference:\n${details(co, iv, null)}\n\nWelcome to the team.\n\n${co.name}${co.phone ? '\n' + co.phone : ''}`
  }
}
