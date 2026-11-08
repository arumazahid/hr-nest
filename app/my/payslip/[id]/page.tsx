'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { sb } from '@/lib/supabase'
import PayslipView from '@/components/PayslipView'

export default function MyPayslip() {
  const { id } = useParams() as { id: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      const res = await fetch('/api/self?payslip=' + id, { headers: { Authorization: 'Bearer ' + data.session?.access_token } })
      const o = await res.json()
      o.error ? setErr(o.error) : setD(o)
    })
  }, [id])

  if (err) return <p className="err" style={{ padding: 30 }}>{err}</p>
  if (!d) return <p className="muted" style={{ padding: 30 }}>Loading...</p>
  return <PayslipView p={d.p} co={d.co} />
}
