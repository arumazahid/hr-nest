'use client'
import { useState } from 'react'
import { Camera } from 'lucide-react'
import { sb } from '@/lib/supabase'
import { resizeImage } from '@/lib/image'
import { isStrong } from '@/lib/password'
import PasswordInput from './PasswordInput'
import { toast } from './Toast'

export default function Profile({ profile, email, role, onSaved }: { profile: any; email: string; role: string; onSaved: (p: any) => void }) {
  const [name, setName] = useState(profile?.name || '')
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar || null)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify({ name, avatar }) })
    const out = await res.json()
    setBusy(false)
    if (!res.ok) return toast(out.error || 'Could not save', 'err')
    onSaved({ ...profile, name, avatar }); toast('Profile saved')
  }
  async function changePw() {
    if (!isStrong(pw)) return toast('Use 10+ characters with uppercase, lowercase, a number and a symbol', 'err')
    const { error } = await sb.auth.updateUser({ password: pw })
    if (error) return toast(error.message, 'err')
    setPw(''); toast('Password changed')
  }

  return (
    <div className="cols2">
      <div className="card">
        <h3>Your profile</h3>
        <div className="profilepic">
          <div className="bigavatar">{avatar ? <img src={avatar} alt="" /> : (name || email)[0]?.toUpperCase()}</div>
          <div>
            <label className="btn ghost sm filebtn"><Camera size={15} /> Upload photo
              <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) setAvatar(await resizeImage(f, 256, 'image/jpeg')) }} />
            </label>
            {avatar && <button className="linkbtn" onClick={() => setAvatar(null)}>Remove photo</button>}
          </div>
        </div>
        <label>Full name</label><input value={name} onChange={e => setName(e.target.value)} />
        <label>Email</label><input value={email} disabled />
        <label>Role</label><input value={role} disabled />
        <button className="btn" disabled={busy} onClick={save}>Save profile</button>
      </div>
      <div className="card">
        <h3>Change password</h3>
        <p className="muted">Use the eye icon to check what you typed. Passwords are stored securely and cannot be read back by anyone, including admins. If someone forgets theirs, an admin can set a new one.</p>
        <label>New password</label>
        <PasswordInput value={pw} onChange={setPw} meter generate autoComplete="new-password" />
        <button className="btn" onClick={changePw}>Update password</button>
      </div>
    </div>
  )
}
