export const units = (l: any) => (l.type === 'half' ? 0.5 : 1)

export function balance(co: any, leaves: any[], year: string) {
  const used = (t: string) =>
    leaves.filter(l => l.status === 'approved' && l.leave_type === t && String(l.day).startsWith(year)).reduce((s, l) => s + units(l), 0)
  return {
    annual: { quota: co.annual_leaves, used: used('annual') },
    sick: { quota: co.sick_leaves, used: used('sick') },
    unpaid: used('unpaid')
  }
}
