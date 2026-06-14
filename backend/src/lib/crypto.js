import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

function getMasterKey() {
  const k = process.env.MASTER_ENCRYPTION_KEY
  if (!k || k.length < 32) throw new Error('MASTER_ENCRYPTION_KEY must be set (min 32 chars)')
  return Buffer.from(k.slice(0, 32))
}

export function encryptKey(plaintext) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getMasterKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

export function decryptKey(encoded) {
  if (!encoded) return null
  const [ivHex, encHex, tagHex] = encoded.split(':')
  const decipher = createDecipheriv('aes-256-gcm', getMasterKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}
