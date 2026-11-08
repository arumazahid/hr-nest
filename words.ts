const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function chunk(n: number) {
  let s = ''
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' Hundred '; n %= 100 }
  if (n >= 20) { s += TENS[Math.floor(n / 10)] + ' '; n %= 10 }
  if (n > 0) s += ONES[n] + ' '
  return s
}

export function words(n: number) {
  if (n === 0) return 'Zero'
  let s = ''
  for (const [v, label] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand'], [1, '']] as [number, string][]) {
    const q = Math.floor(n / v)
    if (q) s += chunk(q) + (label ? label + ' ' : '')
    n %= v
  }
  return s.trim()
}

export function amountWords(amount: number, currency: string) {
  const a = Math.max(0, amount)
  const whole = Math.floor(a)
  const minor = Math.round((a - whole) * 100)
  const unit = ['PKR', 'INR'].includes(currency) ? 'Paisa' : 'Cents'
  return `${words(whole)}${minor ? ` and ${minor} ${unit}` : ''} Only`
}
