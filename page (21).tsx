'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { sb } from '@/lib/supabase'
import PayslipView from '@/components/PayslipView'

export default function Payslip() {
  const { id } = useParams() as { id: string }
  const [p, setP] = useState<any>(null)
  const [co, setCo] = useState<any>(null)
  const [msg, setMsg] = useState('Loading...')

  useEffect(() => {
    sb.from('payroll').select('*, employees(name, job_title, email, employee_code, joining_date, photo_url, departments(name))').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) return setMsg('Payslip not found. Sign in to HR Nest in this browser first.')
      setP(data)
      sb.from('companies').select('*').maybeSingle().then(({ data: c }) => setCo(c))
    })
  }, [id])

  if (!p || !co) return <p className="muted" style={{ padding: 30 }}>{msg}</p>
  return <PayslipView p={p} co={co} />
}
