import { lookupSession } from '../lib/session.js'
import { decryptKey } from '../lib/crypto.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const session = lookupSession(token)
  if (!session) return res.status(401).json({ error: 'unauthorized' })
  req.user = {
    id: session.uid,
    email: session.email,
    anthropicKey: session.anthropic_key_enc ? decryptKey(session.anthropic_key_enc) : null,
    elevenLabsKey: session.elevenlabs_key_enc ? decryptKey(session.elevenlabs_key_enc) : null,
    keysVerifiedAt: session.keys_verified_at,
    hasAnthropicKey: !!session.anthropic_key_enc,
    hasElevenLabsKey: !!session.elevenlabs_key_enc,
  }
  next()
}
