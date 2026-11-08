'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function toast(text: string, kind: 'ok' | 'err' = 'ok') {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('hrn-toast', { detail: { text, kind } }))
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; text: string; kind: string }[]>([])
  useEffect(() => {
    const on = (e: any) => {
      const id = Date.now() + Math.random()
      setItems(x => [...x, { id, ...e.detail }])
      setTimeout(() => setItems(x => x.filter(i => i.id !== id)), e.detail.kind === 'err' ? 6000 : 3500)
    }
    window.addEventListener('hrn-toast', on)
    return () => window.removeEventListener('hrn-toast', on)
  }, [])
  return (
    <div className="toaster">
      {items.map(i => (
        <div key={i.id} className={'toast ' + i.kind}>
          {i.kind === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{i.text}</span>
        </div>
      ))}
    </div>
  )
}
