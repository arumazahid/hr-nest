'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PayslipView from '@/components/PayslipView'

export default function MyPayslip() {
  const { token, id } = useParams() as { token: string; id: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/self?token=${token}&payslip=${id}`).then(r => r.json()).then(o => (o.error ? setErr(o.error) : setD(o)))
  }, [token, id])

  if (err) return <p className="err" style={{ padding: 30 }}>{err}</p>
  if (!d) return <p className="muted" style={{ padding: 30 }}>Loading...</p>
  return <PayslipView p={d.p} co={d.co} />
}
