import crypto from 'crypto'

const key = () => Buffer.from(process.env.ENCRYPTION_KEY as string, 'hex')

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map(b => b.toString('hex')).join(':')
}

export const decrypt = (s: string) => {
  const [iv, tag, enc] = s.split(':').map(h => Buffer.from(h, 'hex'))
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
}
