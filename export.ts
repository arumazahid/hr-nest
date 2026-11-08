export async function exportRows(name: string, rows: Record<string, any>[], format: 'csv' | 'xlsx') {
  if (!rows.length) return
  if (format === 'xlsx') {
    const X = await import('xlsx')
    const book = X.utils.book_new()
    X.utils.book_append_sheet(book, X.utils.json_to_sheet(rows), 'Report')
    X.writeFile(book, name + '.xlsx')
    return
  }
  const cols = Object.keys(rows[0])
  const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.map(q).join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }))
  a.download = name + '.csv'
  a.click()
}
