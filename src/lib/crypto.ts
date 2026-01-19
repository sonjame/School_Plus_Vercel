import crypto from 'crypto'

const SECRET = process.env.GRADE_SECRET

if (!SECRET) {
  throw new Error('❌ GRADE_SECRET is not defined')
}

const KEY = crypto.createHash('sha256').update(SECRET).digest()

export function encrypt(text: string) {
  if (!text) throw new Error('encrypt: empty text')

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(data: string) {
  if (!data) throw new Error('decrypt: empty data')

  const [ivHex, encrypted] = data.split(':')
  const iv = Buffer.from(ivHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
