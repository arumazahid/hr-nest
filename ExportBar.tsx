'use client'
import { exportRows } from '@/lib/export'

export default function ExportBar({ rows, name }: { rows: Record<string, any>[]; name: string }) {
  return (
    <div className="noprint" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
      <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => exportRows(name, rows, 'csv')}>Download CSV</button>
      <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => exportRows(name, rows, 'xlsx')}>Download Excel</button>
      <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => window.print()}>Print</button>
    </div>
  )
}
