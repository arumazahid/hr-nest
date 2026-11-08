'use client'
import { useEffect, useState } from 'react'
import { sb } from '@/lib/supabase'
import MailTemplates from './MailTemplates'

export default function TemplatesPage({ company }: { company: any }) {
  const [templates, setTemplates] = useState<Record<string, any>>({})
  const load = () => sb.from('mail_templates').select('kind, subject, body').then(({ data }) => {
    const m: Record<string, any> = {}; (data || []).forEach((t: any) => (m[t.kind] = t)); setTemplates(m)
  })
  useEffect(() => { load() }, [])
  return <MailTemplates company={company} templates={templates} onSaved={load} />
}
