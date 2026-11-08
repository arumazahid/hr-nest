export function zoned(day: string, hhmm: string, tz: string) {
  const guess = new Date(`${day}T${hhmm}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(guess)
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return new Date(guess.getTime() - (asUtc - guess.getTime()))
}
