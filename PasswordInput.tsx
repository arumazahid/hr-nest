'use client'
import { useState } from 'react'
import { Eye, EyeOff, Wand2, Check, X } from 'lucide-react'
import { checkPassword, generatePassword } from '@/lib/password'

type Props = {
  value: string
  onChange: (v: string) => void
  meter?: boolean
  generate?: boolean
  placeholder?: string
  autoComplete?: string
}

export default function PasswordInput({ value, onChange, meter, generate, placeholder, autoComplete }: Props) {
  const [show, setShow] = useState(false)
  const c = checkPassword(value)
  return (
    <div>
      <div className="pwwrap">
        <input
          type={show ? 'text' : 'password'} value={value} placeholder={placeholder}
          autoComplete={autoComplete || 'current-password'} onChange={e => onChange(e.target.value)}
        />
        <button type="button" className="pweye" title={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {generate && (
        <button type="button" className="linkbtn" onClick={() => { onChange(generatePassword()); setShow(true) }}>
          <Wand2 size={14} /> Suggest a strong password
        </button>
      )}
      {meter && value && (
        <div className="pwmeter">
          <div className="pwbar"><i className={'s' + c.score} style={{ width: (c.score / 5) * 100 + '%' }} /></div>
          <div className="pwlabel"><b>{c.label}</b></div>
          <ul>
            {c.met.map(m => (
              <li key={m.label} className={m.ok ? 'ok' : ''}>{m.ok ? <Check size={13} /> : <X size={13} />}{m.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
