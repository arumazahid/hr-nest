'use client'
import { useParams } from 'next/navigation'
import Portal from '@/components/Portal'

export default function MePage() {
  const { token } = useParams() as { token: string }
  return (
    <div className="wrap">
      <div className="nav"><div className="logo"><span>✓</span>HR Nest</div></div>
      <div style={{ marginTop: 20 }}><Portal token={token} /></div>
    </div>
  )
}
